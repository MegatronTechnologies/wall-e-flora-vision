import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import LanguageSwitcher from './LanguageSwitcher';
import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavbarProps {
  isAuthenticated?: boolean;
}

const Navbar = ({ isAuthenticated = false }: NavbarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <Bot className="h-8 w-8 text-primary" />
          </motion.div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            MegTech
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          
          {!isAuthenticated ? (
            <>
              <Link to="/login">
                <Button variant="ghost" className="hover:text-primary">
                  {t('login')}
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  {t('signup')}
                </Button>
              </Link>
            </>
          ) : (
            <Button
              variant="destructive"
              onClick={handleLogout}
            >
              {t('logout')}
            </Button>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
