import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const detectionPayloadSchema = z.object({
  device_id: z.string().min(1, "device_id is required"),
  main_image: z
    .string()
    .min(1, "main_image is required")
    .refine((val) => val.length < 15_000_000, "main_image too large"),
  status: z.enum(["noObjects", "healthy", "diseased", "mixed"], {
    required_error: "status is required",
    invalid_type_error: "status must be one of: noObjects, healthy, diseased, mixed",
  }),
  confidence: z
    .number({
      invalid_type_error: "confidence must be a number between 0 and 100",
    })
    .min(0)
    .max(100)
    .optional(),
  metadata: z
    .record(z.unknown())
    .optional()
    .default({}),
  plant_images: z
    .array(
      z
        .string()
        .min(1, "plant image cannot be empty")
        .refine((val) => val.length < 12_000_000, "plant image too large"),
    )
    .max(3, "A maximum of 3 plant images is allowed")
    .optional()
  .default([]),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 60;
const rateLimitState = new Map<string, { count: number; reset: number }>();

const jsonParseErrorResponse = (headers: Record<string, string>) =>
  new Response(
    JSON.stringify({ error: "Invalid JSON body" }),
    {
      status: 400,
      headers,
    },
  );

const validationErrorResponse = (issues: string[], headers: Record<string, string>) =>
  new Response(
    JSON.stringify({ error: "Validation failed", details: issues }),
    {
      status: 400,
      headers,
    },
  );

const decodeBase64Image = (value: string, label: string) => {
  const cleaned = value.includes(",") ? value.split(",").pop() ?? "" : value;
  try {
    return Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  } catch (_error) {
    throw new Error(`${label} is not valid base64-encoded data`);
  }
};

const uploadImage = async (
  supabase: ReturnType<typeof createClient>,
  filePath: string,
  fileData: Uint8Array,
  label: string,
) => {
  const { error: uploadError } = await supabase.storage
    .from("detection-images")
    .upload(filePath, fileData, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    console.error(`Error uploading ${label}:`, uploadError);
    throw new Error(`Failed to upload ${label}`);
  }

  const { data: urlData } = supabase.storage
    .from("detection-images")
    .getPublicUrl(filePath);

  return urlData.publicUrl;
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const requestStart = performance.now();
  const headersWithRequestId = {
    ...corsHeaders,
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
  };

  const logWithId = (message: string, data?: unknown) => {
    if (data !== undefined) {
      console.log(`[${requestId}] ${message}`, data);
    } else {
      console.log(`[${requestId}] ${message}`);
    }
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, "X-Request-Id": requestId } });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const raspberryPiApiKey = Deno.env.get('RASPBERRY_PI_API_KEY')!;

    // Verify API key from Raspberry Pi
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`[${requestId}] Missing or invalid Authorization header`);
      return new Response(
        JSON.stringify({ error: 'Missing API key' }),
        { status: 401, headers: headersWithRequestId }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');
    if (apiKey !== raspberryPiApiKey) {
      logWithId('Invalid API key provided');
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 403, headers: headersWithRequestId }
      );
    }

    // Parse request body
    let payloadJson: unknown;
    try {
      payloadJson = await req.json();
    } catch (_err) {
      console.error(`[${requestId}] Request body is not valid JSON`);
      return jsonParseErrorResponse(headersWithRequestId);
    }

    const parsed = detectionPayloadSchema.safeParse(payloadJson);
    if (!parsed.success) {
      const formatted = parsed.error.issues.map((issue) => issue.message);
      logWithId("Payload validation failed", formatted);
      return validationErrorResponse(formatted, headersWithRequestId);
    }

    const {
      device_id,
      main_image,
      plant_images,
      status,
      confidence,
      metadata,
    } = parsed.data;

    logWithId('Received detection from device', { device_id, status });

    // Simple in-memory rate limiting per device
    const rateLimit = Number(
      Deno.env.get("RASPBERRY_PI_RATE_LIMIT_PER_MINUTE") ?? DEFAULT_RATE_LIMIT,
    );
    if (Number.isFinite(rateLimit) && rateLimit > 0) {
      const nowMs = Date.now();
      const state = rateLimitState.get(device_id);
      if (!state || nowMs > state.reset) {
        rateLimitState.set(device_id, {
          count: 1,
          reset: nowMs + RATE_LIMIT_WINDOW_MS,
        });
      } else if (state.count >= rateLimit) {
        const retryAfter = Math.ceil((state.reset - nowMs) / 1000);
        logWithId("Rate limit exceeded", { device_id, retryAfter });
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
          {
            status: 429,
            headers: {
              ...headersWithRequestId,
              "Retry-After": String(retryAfter),
            },
          },
        );
      } else {
        state.count += 1;
      }
    }

    // Validate required fields
    if (!device_id || !main_image || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: device_id, main_image, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upload main image to storage
    const now = Date.now();
    const randomSuffix = crypto.randomUUID();
    const mainImageFileName = `${device_id}/${now}_main_${randomSuffix}.jpg`;

    let mainImageUrl: string;
    try {
      const mainImageBuffer = decodeBase64Image(main_image, "main_image");
      mainImageUrl = await uploadImage(
        supabase,
        mainImageFileName,
        mainImageBuffer,
        "main image",
      );
    } catch (imageError) {
      const message = imageError instanceof Error
        ? imageError.message
        : "Failed to process main image";
      const statusCode = message.startsWith("Failed to upload") ? 500 : 400;
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: statusCode,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Main image uploaded:", mainImageUrl);

    // Insert detection record
    const { data: detectionData, error: detectionError } = await supabase
      .from('detections')
      .insert({
        device_id,
        image_url: mainImageUrl,
        status,
        confidence: confidence || null,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (detectionError) {
      logWithId('Error inserting detection', detectionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create detection record', details: detectionError.message }),
        { status: 500, headers: headersWithRequestId }
      );
    }

    logWithId('Detection created', { detectionId: detectionData.id });

    // Upload plant images if provided
    if (plant_images.length > 0) {
      const plantImagePromises = plant_images.map(async (imageBase64, index) => {
        const fileName = `${device_id}/${now}_plant_${index + 1}_${randomSuffix}.jpg`;
        try {
          const imageBuffer = decodeBase64Image(imageBase64, `plant_images[${index}]`);
          const imageUrl = await uploadImage(
            supabase,
            fileName,
            imageBuffer,
            `plant image ${index + 1}`,
          );

          return {
            detection_id: detectionData.id,
            image_url: imageUrl,
            order_num: index + 1,
          };
        } catch (plantImageError) {
          logWithId(
            "Plant image upload failed",
            plantImageError instanceof Error ? plantImageError.message : plantImageError,
          );
          return null;
        }
      });

      const plantImageRecords = (await Promise.all(plantImagePromises)).filter(
        Boolean,
      ) as Array<{
        detection_id: string;
        image_url: string;
        order_num: number;
      }>;

      if (plantImageRecords.length !== plant_images.length) {
        logWithId(
          `Only ${plantImageRecords.length} of ${plant_images.length} plant images uploaded successfully`,
        );
      }

      if (plantImageRecords.length > 0) {
        const { error: plantImagesError } = await supabase
          .from("detection_images")
          .insert(plantImageRecords);

        if (plantImagesError) {
          logWithId("Error inserting plant images", plantImagesError);
        } else {
          logWithId(`Inserted ${plantImageRecords.length} plant images`);
        }
      }
    }

    const response = new Response(
      JSON.stringify({ 
        success: true, 
        detection_id: detectionData.id,
        message: 'Detection saved successfully'
      }),
      { status: 200, headers: headersWithRequestId }
    );

    logWithId("Request completed", {
      detectionId: detectionData.id,
      durationMs: Number((performance.now() - requestStart).toFixed(2)),
    });

    return response;
  } catch (error) {
    const requestDuration = Number((performance.now() - requestStart).toFixed(2));
    console.error(`[${requestId}] Error in submit-detection function:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: headersWithRequestId }
    );
  }
});
