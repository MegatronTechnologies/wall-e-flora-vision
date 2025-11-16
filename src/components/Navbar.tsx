import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import LanguageSwitcher from "./LanguageSwitcher";
import { Bot, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { useState } from "react";

const Navbar = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      logger.info("Navbar", "User logged out");
      navigate("/login");
      toast({
        title: t("logout"),
      });
      setIsOpen(false);
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

  const NavLinks = () => (
    <>
      <Link to="/about-project" onClick={() => setIsOpen(false)}>
        <Button variant="ghost" size="sm" className="hover:text-primary w-full justify-start">
          {t("nav.aboutProject")}
        </Button>
      </Link>
      <Link to="/about" onClick={() => setIsOpen(false)}>
        <Button variant="ghost" size="sm" className="hover:text-primary w-full justify-start">
          {t("nav.aboutUs")}
        </Button>
      </Link>
      {loading ? null : user ? (
        <>
          {role === "superadmin" && (
            <>
              <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  {t("nav.userPanel")}
                </Button>
              </Link>
              <Link to="/admin" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  {t("nav.adminPanel")}
                </Button>
              </Link>
            </>
          )}
          <div className="text-sm text-muted-foreground px-3 py-2 lg:hidden">
            {user.email} {role === "superadmin" ? "• Superadmin" : ""}
          </div>
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            {t("logout")}
          </Button>
        </>
      ) : (
        !isSuperAdminRoute && (
          <Link to="/login" onClick={() => setIsOpen(false)}>
            <Button variant="ghost" className="hover:text-primary w-full justify-start">
              {t("login")}
            </Button>
          </Link>
        )
      )}
    </>
  );

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg"
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3 lg:py-4">
        <Link to="/" className="group flex items-center gap-2 lg:gap-3">
          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
            <Bot className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
          </motion.div>
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-xl lg:text-2xl font-bold text-transparent">
            MegTech
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-4">
          <LanguageSwitcher />
          <NavLinks />
          {user && (
            <span className="text-sm text-muted-foreground hidden xl:block">
              {user.email} {role === "superadmin" ? "• Superadmin" : ""}
            </span>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <div className="flex flex-col gap-4 mt-8">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
