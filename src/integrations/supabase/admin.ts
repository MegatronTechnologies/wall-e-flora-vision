import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
  const { data, error } = await supabase
    .from("profiles")
    .select(adminSelect)
    .order("created_at", { ascending: false });

  if (error) {
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
}) => invokeManageUsers<AdminUser>("create", input);

export const updateAdminUser = async (input: {
  id: string;
  email: string;
  full_name: string | null;
  role: RoleOption;
}) => invokeManageUsers<AdminUser>("update", input);

export const deleteAdminUser = async (id: string) =>
  invokeManageUsers<null>("delete", { id });
