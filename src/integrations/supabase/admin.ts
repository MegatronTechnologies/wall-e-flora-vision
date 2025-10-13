import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

export type RoleOption = Tables<"user_roles">["role"];

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: RoleOption;
  created_at: string;
}

const DEFAULT_ROLE: RoleOption = "user";

const ensureAuthenticated = async () => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    logger.warn("AdminService", "No active session found for admin operations");
    throw new Error("AUTH_REQUIRED");
  }
  return data.session;
};

export const fetchAdminUsers = async (): Promise<AdminUser[]> => {
  await ensureAuthenticated();
  logger.debug("AdminService", "Fetching profiles with roles");

  const [{ data: profiles, error: profilesError }, { data: rolesData, error: rolesError }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (profilesError) {
    logger.error("AdminService", "Failed to fetch profiles", profilesError);
    throw profilesError;
  }

  if (rolesError) {
    logger.warn("AdminService", "Failed to fetch roles", rolesError);
  }

  const roleMap = new Map<string, RoleOption>();
  rolesData?.forEach((entry) => {
    if (entry?.user_id && entry.role) {
      roleMap.set(entry.user_id, entry.role as RoleOption);
    }
  });

  return (profiles ?? []).map((profile) => ({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: roleMap.get(profile.id) ?? DEFAULT_ROLE,
    created_at: profile.created_at,
  }));
};

type ManageUserAction = "create" | "update" | "delete";

interface ManageUserPayload {
  id?: string;
  email?: string;
  full_name?: string | null;
  password?: string;
  role?: RoleOption;
}

const invokeManageUsers = async <TResponse>(
  action: ManageUserAction,
  payload: ManageUserPayload,
) => {
  const { data, error } = await supabase.functions.invoke<TResponse>(
    "manage-users",
    {
      body: { action, payload },
    },
  );

  if (error) {
    logger.error("AdminService", "Edge function invocation failed", error);
    throw error;
  }

  return data!;
};

export const createAdminUser = async (input: {
  email: string;
  full_name: string | null;
  role: RoleOption;
  password?: string;
}) => {
  await ensureAuthenticated();
  logger.debug("AdminService", "Creating user via edge function", input.email);
  const user = await invokeManageUsers<AdminUser>("create", input);
  logger.info("AdminService", "User created via edge function", user.id);
  return user;
};

export const updateAdminUser = async (input: {
  id: string;
  email: string;
  full_name: string | null;
  role: RoleOption;
}) => {
  await ensureAuthenticated();
  logger.debug("AdminService", "Updating user via edge function", input.id);
  const user = await invokeManageUsers<AdminUser>("update", input);
  logger.info("AdminService", "User updated via edge function", user.id);
  return user;
};

export const deleteAdminUser = async (id: string) => {
  await ensureAuthenticated();
  await invokeManageUsers<null>("delete", { id });
  logger.info("AdminService", "User deleted via edge function", id);
  return null;
};
