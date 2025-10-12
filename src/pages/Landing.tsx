import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Sprout, Users, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Landing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: t('contact.success'),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="inline-block"
            >
              <Sprout className="h-20 w-20 text-primary mx-auto" />
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                {t('hero.title')}
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('hero.subtitle')}
            </p>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 animate-glow"
                onClick={() => navigate('/dashboard')}
              >
                {t('hero.getStarted')}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6 justify-center">
              <Users className="h-8 w-8 text-primary" />
              <h2 className="text-4xl font-bold">{t('about.title')}</h2>
            </div>
            
            <p className="text-lg text-muted-foreground text-center leading-relaxed">
              {t('about.description')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-8 justify-center">
              <Mail className="h-8 w-8 text-primary" />
              <h2 className="text-4xl font-bold">{t('contact.title')}</h2>
            </div>
            
            <form onSubmit={handleContact} className="space-y-6">
              <div>
                <Input
                  placeholder={t('contact.name')}
                  className="bg-card border-border focus:border-primary"
                  required
                />
              </div>
              
              <div>
                <Input
                  type="email"
                  placeholder={t('contact.email')}
                  className="bg-card border-border focus:border-primary"
                  required
                />
              </div>
              
              <div>
                <Textarea
                  placeholder={t('contact.message')}
                  className="bg-card border-border focus:border-primary min-h-[150px]"
                  required
                />
              </div>
              
              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary hover:bg-primary/90"
              >
                {t('contact.send')}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
