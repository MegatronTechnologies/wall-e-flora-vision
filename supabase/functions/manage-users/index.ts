import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const managePayloadSchema = z.object({
  action: z.enum(["create", "update", "delete"]),
  payload: z
    .object({
      id: z.string().uuid().optional(),
      email: z.string().email().optional(),
      full_name: z.string().nullable().optional(),
      password: z.string().min(6).optional(),
      role: z.enum(["user", "superadmin"]).optional(),
    })
    .refine((data) => {
      if (data.role && !data.email && !data.id) {
        return false;
      }
      return true;
    }, "Invalid payload"),
});

const createSupabaseClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceKey, {
    global: { headers: { "X-Client-Info": "manage-users-function" } },
  });
};

const getRequester = async (token: string) => {
  const client = createSupabaseClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error("Unauthorized");
  }
  return { supabase: client, userId: data.user.id };
};

const ensureSuperadmin = async (supabase: ReturnType<typeof createSupabaseClient>, userId: string) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Forbidden");
  }
};

const createUser = async (
  supabase: ReturnType<typeof createSupabaseClient>,
  email: string,
  full_name: string | null | undefined,
  role: "user" | "superadmin" | undefined,
  password: string | undefined,
) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    ...(password ? { password } : {}),
    user_metadata: { full_name },
  });

  if (error || !data?.user) {
    throw new Error(error?.message ?? "Failed to create user");
  }

  const userId = data.user.id;

  if (role && role !== "user") {
    const { error: roleError } = await supabase
      .from("user_roles")
      .update({ role })
      .eq("user_id", userId);

    if (roleError) {
      throw new Error(roleError.message);
    }
  }

  return {
    id: userId,
    email,
    full_name,
    role: role ?? "user",
    created_at: data.user.created_at ?? new Date().toISOString(),
  };
};

const updateUser = async (
  supabase: ReturnType<typeof createSupabaseClient>,
  id: string,
  email: string | undefined,
  full_name: string | null | undefined,
  role: "user" | "superadmin" | undefined,
) => {
  if (email || full_name !== undefined) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        ...(email ? { email } : {}),
        ...(full_name !== undefined ? { full_name } : {}),
      })
      .eq("id", id);

    if (profileError) {
      throw new Error(profileError.message);
    }
  }

  if (role) {
    const { error: roleError } = await supabase
      .from("user_roles")
      .update({ role })
      .eq("user_id", id);

    if (roleError) {
      throw new Error(roleError.message);
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at, user_roles(role)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "User not found");
  }

  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    created_at: data.created_at,
    role: data.user_roles?.[0]?.role ?? "user",
  };
};

const deleteUser = async (supabase: ReturnType<typeof createSupabaseClient>, id: string) => {
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) {
    throw new Error(error.message);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { supabase, userId } = await getRequester(authHeader);
    await ensureSuperadmin(supabase, userId);

    const body = await req.json();
    const result = managePayloadSchema.safeParse(body);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: result.error.issues.map((issue) => issue.message),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { action, payload } = result.data;

    switch (action) {
      case "create": {
        if (!payload.email) {
          throw new Error("Email is required");
        }

        const newUser = await createUser(
          supabase,
          payload.email,
          payload.full_name ?? null,
          payload.role,
          payload.password,
        );

        return new Response(JSON.stringify(newUser), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "update": {
        if (!payload.id) {
          throw new Error("User id is required");
        }

        const updatedUser = await updateUser(
          supabase,
          payload.id,
          payload.email,
          payload.full_name ?? null,
          payload.role,
        );

        return new Response(JSON.stringify(updatedUser), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "delete": {
        if (!payload.id) {
          throw new Error("User id is required");
        }

        await deleteUser(supabase, payload.id);

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } catch (error) {
    console.error("manage-users error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
