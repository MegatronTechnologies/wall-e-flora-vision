import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
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

    // Get authenticated user for /detect endpoint
    let authHeader: string | null = null;
    if (endpoint === "/detect") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization")!,
          },
        },
        auth: {
          persistSession: false,
        },
      });

      const { data: { user }, error } = await supabaseClient.auth.getUser();
      
      if (error || !user) {
        console.error("Authentication failed:", error);
        return new Response(
          JSON.stringify({ error: "Unauthorized. Please log in." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the user's access token to pass to Raspberry Pi
      authHeader = req.headers.get("Authorization");
      console.log("User authenticated:", user.email);
    }

    // Proxy request to Raspberry Pi
    const piUrl = `${PI_URL}${endpoint}`;
    const method = req.method;
    
    // Add Authorization header for /detect endpoint
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const piResponse = await fetch(piUrl, {
      method,
      headers,
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
