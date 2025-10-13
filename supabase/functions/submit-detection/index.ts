import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const raspberryPiApiKey = Deno.env.get('RASPBERRY_PI_API_KEY')!;

    // Verify API key from Raspberry Pi
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');
    if (apiKey !== raspberryPiApiKey) {
      console.error('Invalid API key provided');
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { device_id, main_image, plant_images, status, confidence, metadata } = await req.json();

    console.log('Received detection from device:', device_id);

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
    const mainImageFileName = `${device_id}/${Date.now()}_main.jpg`;
    const mainImageBuffer = Uint8Array.from(atob(main_image), c => c.charCodeAt(0));
    
    const { data: mainImageData, error: mainImageError } = await supabase.storage
      .from('detection-images')
      .upload(mainImageFileName, mainImageBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (mainImageError) {
      console.error('Error uploading main image:', mainImageError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload main image', details: mainImageError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL for main image
    const { data: { publicUrl: mainImageUrl } } = supabase.storage
      .from('detection-images')
      .getPublicUrl(mainImageFileName);

    console.log('Main image uploaded:', mainImageUrl);

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
      console.error('Error inserting detection:', detectionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create detection record', details: detectionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Detection created:', detectionData.id);

    // Upload plant images if provided
    if (plant_images && Array.isArray(plant_images) && plant_images.length > 0) {
      const plantImagePromises = plant_images.slice(0, 3).map(async (imageBase64, index) => {
        const fileName = `${device_id}/${Date.now()}_plant_${index + 1}.jpg`;
        const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('detection-images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error(`Error uploading plant image ${index + 1}:`, uploadError);
          return null;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('detection-images')
          .getPublicUrl(fileName);

        return {
          detection_id: detectionData.id,
          image_url: publicUrl,
          order_num: index + 1
        };
      });

      const plantImageRecords = (await Promise.all(plantImagePromises)).filter(Boolean);

      if (plantImageRecords.length > 0) {
        const { error: plantImagesError } = await supabase
          .from('detection_images')
          .insert(plantImageRecords);

        if (plantImagesError) {
          console.error('Error inserting plant images:', plantImagesError);
        } else {
          console.log(`Uploaded ${plantImageRecords.length} plant images`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        detection_id: detectionData.id,
        message: 'Detection saved successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-detection function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});