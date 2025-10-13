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

const adminSelect = `
  *,
  user_roles(role)
`;

const extractRole = (
  record: {
    user_roles?: Array<Pick<Tables<"user_roles">, "role"> | null> | null;
  },
): RoleOption => {
  const role = record.user_roles?.find(
    (entry): entry is Pick<Tables<"user_roles">, "role"> => Boolean(entry),
  );
  return role?.role ?? DEFAULT_ROLE;
};

export const fetchAdminUsers = async (): Promise<AdminUser[]> => {
  logger.debug("AdminService", "Fetching profiles with roles");
  const { data, error } = await supabase
    .from("profiles")
    .select(adminSelect)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("AdminService", "Failed to fetch users", error);
    throw error;
  }

  return (data ?? []).map((profile) => ({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: extractRole(profile),
    created_at: profile.created_at,
  }));
};

type ManageUserAction = "create" | "update" | "delete";

interface ManageUserPayload {
  id?: string;
  email?: string;
  full_name?: string | null;
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
    throw error;
  }

  return data!;
};

export const createAdminUser = async (input: {
  email: string;
  full_name: string | null;
  role: RoleOption;
}) => {
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
  logger.debug("AdminService", "Updating user via edge function", input.id);
  const user = await invokeManageUsers<AdminUser>("update", input);
  logger.info("AdminService", "User updated via edge function", user.id);
  return user;
};

export const deleteAdminUser = async (id: string) =>
  invokeManageUsers<null>("delete", { id }).then(() => {
    logger.info("AdminService", "User deleted via edge function", id);
    return null;
  });
