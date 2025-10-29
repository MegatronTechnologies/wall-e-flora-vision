import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { useAuth } from "@/context/AuthContext";
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email format" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(128, { message: "Password must be less than 128 characters" }),
});

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, user, role, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    logger.info("LoginPage", "Rendered login page");
  }, []);

  useEffect(() => {
    if (!loading && user) {
      const destination = role === "superadmin" ? "/admin" : "/dashboard";
      logger.debug("LoginPage", "Already authenticated, redirecting", destination);
      navigate(destination, { replace: true });
    }
  }, [loading, navigate, role, user]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    logger.debug("LoginPage", "Attempting login", { email });

    // Validate input with Zod
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      logger.warn("LoginPage", "Validation failed", firstError);
      toast({
        title: t("common.error", { defaultValue: "Xəta baş verdi" }),
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    const validatedData = validation.data;

    setSubmitting(true);
    try {
      const { role: signInRole } = await signIn(validatedData.email, validatedData.password);
      const fromState = location.state as { from?: { pathname: string } } | undefined;
      const destination = fromState?.from?.pathname ?? (signInRole === "superadmin" ? "/admin" : "/dashboard");
      logger.info("LoginPage", "Login successful, redirecting", destination);
      toast({
        title: t("login"),
        description: t("auth.loginSuccess", { defaultValue: "Uğurla daxil oldunuz." }),
      });
      navigate(destination, { replace: true });
    } catch (error) {
      logger.error("LoginPage", "Error while logging in", error);
      toast({
        title: t("common.error", { defaultValue: "Xəta baş verdi" }),
        description:
          error instanceof Error
            ? error.message
            : t("auth.genericError", { defaultValue: "Daxil olarkən problem yarandı." }),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex min-h-screen items-center justify-center px-4 pb-12 pt-24">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="space-y-6 rounded-lg border border-border bg-card p-8">
            <div className="space-y-2 text-center">
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="inline-block">
                <Bot className="mx-auto h-16 w-16 text-primary" />
              </motion.div>
              <h1 className="text-3xl font-bold">{t("login")}</h1>
              <p className="text-sm text-muted-foreground">Wall-E Plant Health Detector</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("contact.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="border-border bg-background focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="border-border bg-background focus:border-primary"
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="lg" disabled={submitting}>
                {submitting ? t("common.loading") : t("login")}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
