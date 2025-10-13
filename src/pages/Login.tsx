import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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

    if (!email || !password) {
      logger.warn("LoginPage", "Missing credentials");
      toast({
        title: t("common.error", { defaultValue: "Xəta baş verdi" }),
        description: t("auth.missingCredentials", { defaultValue: "Email və parol boş ola bilməz" }),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { role: signInRole } = await signIn(email, password);
      const fromState = location.state as { from?: { pathname: string } } | undefined;
      const from = fromState?.from?.pathname;
      const destination = from ?? (signInRole === "superadmin" ? "/admin" : "/dashboard");
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
        description: error instanceof Error ? error.message : t("auth.genericError", { defaultValue: "Daxil olarkən problem yarandı." }),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-lg p-8 space-y-6">
            <div className="text-center space-y-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Bot className="h-16 w-16 text-primary mx-auto" />
              </motion.div>
              <h1 className="text-3xl font-bold">{t('login')}</h1>
              <p className="text-muted-foreground">Wall-E Plant Health Detector</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('contact.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border focus:border-primary"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={submitting}
                size="lg"
              >
                {submitting ? t("common.loading") : t("login")}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                {t("signup")}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
