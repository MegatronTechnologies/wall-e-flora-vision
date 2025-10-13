import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import LanguageSwitcher from "./LanguageSwitcher";
import { Bot } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

const Navbar = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, signOut, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      logger.info("Navbar", "User logged out");
      navigate("/login");
      toast({
        title: t("logout"),
      });
    } catch (error) {
      logger.error("Navbar", "Failed to logout", error);
      toast({
        title: t("common.error"),
        description: t("auth.genericError"),
        variant: "destructive",
      });
    }
  };

  const isSuperAdminRoute = location.pathname.startsWith("/admin");

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg"
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link to="/" className="group flex items-center gap-3">
          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
            <Bot className="h-8 w-8 text-primary" />
          </motion.div>
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-2xl font-bold text-transparent">
            MegTech
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {loading ? null : user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:block">
                {user.email} {role === "superadmin" ? "• Superadmin" : ""}
              </span>
              <Button variant="destructive" onClick={handleLogout}>
                {t("logout")}
              </Button>
            </>
          ) : (
            <>
              {!isSuperAdminRoute && (
                <Link to="/login">
                  <Button variant="ghost" className="hover:text-primary">
                    {t("login")}
                  </Button>
                </Link>
              )}
              <Link to="/signup">
                <Button className="bg-primary hover:bg-primary/90">{t("signup")}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
