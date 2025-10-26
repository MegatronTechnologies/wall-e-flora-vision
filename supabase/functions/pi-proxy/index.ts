import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const PI_URL = Deno.env.get("VITE_PI_STREAM_URL") || "http://192.168.1.100:8080";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Proxy request to Raspberry Pi
    const piUrl = `${PI_URL}${endpoint}`;
    const method = req.method;
    
    const piResponse = await fetch(piUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Handle snapshot endpoint (returns image)
    if (endpoint.startsWith("/snapshot")) {
      const imageBlob = await piResponse.blob();
      return new Response(imageBlob, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // Handle stream endpoint (MJPEG streaming)
    if (endpoint.startsWith("/stream")) {
      // For MJPEG streaming, we need to pass through the body stream
      return new Response(piResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "multipart/x-mixed-replace; boundary=frame",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Connection": "keep-alive",
        },
      });
    }

    // Handle JSON responses (status, detect)
    const data = await piResponse.json();
    return new Response(JSON.stringify(data), {
      status: piResponse.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Pi proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to connect to Raspberry Pi" }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
