import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { RoleOption } from "@/integrations/supabase/admin";
import { logger } from "@/lib/logger";

interface AuthContextValue {
  user: User | null;
  role: RoleOption | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; role: RoleOption | null }>;
  signUp: (name: string, email: string, password: string) => Promise<{ user: User | null; role: RoleOption | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const fetchUserRole = async (userId: string): Promise<RoleOption | null> => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.warn("AuthContext", "Unable to fetch user role", error);
    return null;
  }

  return data?.role ?? null;
};

const handleSession = async (
  session: Session | null,
  setUser: (user: User | null) => void,
  setRole: (role: RoleOption | null) => void,
) => {
  if (session?.user) {
    setUser(session.user);
    const role = await fetchUserRole(session.user.id);
    setRole(role);
  } else {
    setUser(null);
    setRole(null);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<RoleOption | null>(null);
  const [loading, setLoading] = useState(true);

  const syncSession = useCallback(
    async (initialCall = false) => {
      if (initialCall) {
        setLoading(true);
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        await handleSession(data.session, setUser, setRole);
      } catch (error) {
        logger.error("AuthContext", "Failed to synchronise session", error);
        setUser(null);
        setRole(null);
      } finally {
        if (initialCall) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    syncSession(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      logger.debug("AuthContext", "Auth state change", _event);
      handleSession(session, setUser, setRole).finally(() => setLoading(false));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        logger.error("AuthContext", "Sign in failed", error);
        throw error;
      }
      const nextRole = data.user ? await fetchUserRole(data.user.id) : null;
      setUser(data.user);
      setRole(nextRole);
      return { user: data.user, role: nextRole };
    },
    [],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: undefined,
        },
      });
      if (error) {
        logger.error("AuthContext", "Sign up failed", error);
        throw error;
      }
      const nextRole = data.user ? await fetchUserRole(data.user.id) : null;
      setUser(data.user ?? null);
      setRole(nextRole);
      return { user: data.user ?? null, role: nextRole };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error("AuthContext", "Sign out failed", error);
      throw error;
    }
    setUser(null);
    setRole(null);
  }, []);

  const refresh = useCallback(async () => {
    await syncSession(true);
  }, [syncSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      loading,
      signIn,
      signUp,
      signOut,
      refresh,
    }),
    [loading, refresh, role, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

