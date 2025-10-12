import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'eng' ? 'az' : 'eng';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2 border-border hover:border-primary transition-all"
    >
      <Globe className="h-4 w-4" />
      <span className="uppercase font-semibold">{i18n.language}</span>
    </Button>
  );
};

export default LanguageSwitcher;
