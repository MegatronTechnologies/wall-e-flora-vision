import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Sprout, Users, Mail, Bot, Camera, Zap, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import walleRobot from "@/assets/wall-e-robot.png";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email format" })
    .max(255, { message: "Email must be less than 255 characters" }),
  message: z
    .string()
    .trim()
    .min(1, { message: "Message is required" })
    .max(2000, { message: "Message must be less than 2000 characters" }),
});

const Landing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useEffect(() => {
    logger.info('LandingPage', 'Landing page rendered');
  }, []);

  const handleContact = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawPayload = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
    };

    logger.debug('LandingPage', 'Submitting contact form');

    // Validate with Zod
    const validation = contactSchema.safeParse(rawPayload);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      logger.warn('LandingPage', 'Contact form validation failed', firstError);
      toast({
        title: t('common.error'),
        description: firstError.message,
        variant: 'destructive',
      });
      return;
    }

    const payload = validation.data;

    try {
      toast({
        title: t('contact.success'),
      });
      logger.info('LandingPage', 'Contact form submitted', payload.email);
      event.currentTarget.reset();
    } catch (error) {
      logger.error('LandingPage', 'Failed to submit contact form', error);
      toast({
        title: t('common.error'),
        description: t('contact.submitError', { defaultValue: 'Sorğunu göndərmək mümkün olmadı.' }),
        variant: 'destructive',
      });
    }
  };

  const { i18n } = useTranslation();

  const aboutContent = {
    az: {
      intro:
        'Mən — Aydın Sulxayev (11-ci sinif), Zaqatala, Azərbaycan. Proqramlaşdırma dilləri: Python, HTML, CSS, JavaScript. Raspberry Pi ilə təcrübəm var. Komandamız — MegTech (Aydın Sulxayev və Nihat Muradlı) SAF 2025 yarışmasının Innovation and Entrepreneurship kateqoriyasında iştirak edir.',
      competition: 'SAF 2025 — Innovation and Entrepreneurship',
      sections: [
        {
          title: 'Layihənin təsviri',
          items: [
            'Wall‑E temalı robot: Intel RealSense D455 kamera və Raspberry Pi 5 üzərində YOLOv8 ilə xrizantema bitkilərini və onların üzərində “mealybug_infestation” aşkarlanmasını həyata keçirir.',
            'Veb tətbiq vasitəsilə Detect nəticələri idarə olunur və istifadəçiyə göstərilir.',
          ],
        },
        {
          title: 'İş prinsipi (Detect axını)',
          items: [
            'İstifadəçi User Dashboard-da “Detect” düyməsinə klik edir; Raspberry Pi-də işləyən YOLOv8 prosesinə sorğu göndərilir.',
            'Pi cavab olaraq snapshot (ümumi kadr), hər “Chrysanthemum” üçün kəsilmiş şəkil və etibarlılıq faizi, xəstəlik statusu (kəsikdə “mealybug_infestation” varsa — xəstə), tarix və vaxt qaytarır.',
            'Saytda həmin məlumata əsasən yeni Detect kartı yaranır.',
          ],
        },
        {
          title: 'Mümkün nəticələr',
          items: [
            '0 Objects Detected — xrizantema aşkar edilməyib: yalnız sübut kimi ümumi şəkil göstərilir.',
            '“Chrysanthemum” detected — “mealybug_infestation” yoxdur: kəsilmiş sağlam bitki şəkilləri və ümumi kadr.',
            '“Chrysanthemum” və “mealybug_infestation” detected — xəstə: ümumi kadr, kəsilmiş şəkillər və müalicə/izolasiya haqqında məlumat.',
            'Birdən çox xrizantema: bəziləri sağlam, bəziləri xəstə — kart daxilində ayrı-ayrılıqda göstərilir.',
          ],
        },
        {
          title: 'Veb tətbiq səhifələri',
          items: [
            'Landing Page (haqqımızda və əlaqə)',
            'User Dashboard (Detect və şəkil yükləmə)',
            'SuperAdmin Panel (hesabların yaradılması/silinməsi/redaktəsi)',
          ],
        },
        {
          title: 'Avadanlıq',
          items: [
            'Wall‑E üslubunda robot gövdəsi',
            'Intel RealSense D455 kamera',
            'Raspberry Pi 5',
            'Opsional: dinamik, baş və qolların hərəkəti',
          ],
        },
        {
          title: 'Komanda və bacarıqlar',
          items: [
            'MegTech — 2 iştirakçı: Aydın Sulxayev və Nihat Muradlı (Zaqatala, Azərbaycan)',
            'Proqramlaşdırma: Python, HTML, CSS, JavaScript; Raspberry Pi təcrübəsi',
            'Maraqlar: Robototexnika və İT',
          ],
        },
      ],
    },
    eng: {
      intro:
        "I'm Aydın Sulxayev (11th grade), from Zaqatala, Azerbaijan. I know Python, HTML, CSS, JavaScript and have experience with Raspberry Pi. Our team — MegTech (Aydın Sulxayev and Nihat Muradli) participates in SAF 2025 in the Innovation and Entrepreneurship category.",
      competition: 'SAF 2025 — Innovation and Entrepreneurship',
      sections: [
        {
          title: 'Project Overview',
          items: [
            'Wall‑E inspired robot: Intel RealSense D455 + Raspberry Pi 5 running YOLOv8 to detect Chrysanthemums and “mealybug_infestation”.',
            'Detect results are presented and managed in a web application.',
          ],
        },
        {
          title: 'Detection Workflow',
          items: [
            'User clicks Detect in the User Dashboard; a request is sent to the Raspberry Pi running YOLOv8.',
            'Pi responds with a snapshot, cropped images for each detected “Chrysanthemum” with confidence, disease flag (if a crop has “mealybug_infestation”), and date/time.',
            'The site creates a Detect card with all details.',
          ],
        },
        {
          title: 'Possible Outcomes',
          items: [
            '0 Objects Detected — no chrysanthemum found: show only the snapshot as evidence.',
            '“Chrysanthemum” detected — no “mealybug_infestation”: cropped healthy images and the snapshot.',
            '“Chrysanthemum” and “mealybug_infestation” detected — diseased: snapshot, crops and treatment/isolating info.',
            'Multiple chrysanthemums: if any is diseased, overall status is "diseased".',
          ],
        },
        {
          title: 'Web Application Pages',
          items: [
            'Landing Page (about and contact)',
            'User Dashboard (Detect and image upload)',
            'SuperAdmin Panel (create/delete/edit accounts)',
          ],
        },
        {
          title: 'Hardware',
          items: [
            'Wall‑E style chassis',
            'Intel RealSense D455 camera',
            'Raspberry Pi 5',
            'Optional: speaker, head and arm movement',
          ],
        },
        {
          title: 'Team and Skills',
          items: [
            'MegTech — 2 participants: Sulxayev Aydın and Nihat Muradli (Zaqatala, Azerbaijan)',
            'Programming: Python, HTML, CSS, JavaScript; Raspberry Pi experience',
            'Interests: Robotics and IT',
          ],
        },
      ],
    },
  } as const;

  const lang = i18n.language?.startsWith('az') ? 'az' : 'eng';
  const localized = aboutContent[lang];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section with Wall-E */}
      <section className="relative py-20 overflow-hidden pt-32 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-12 md:grid-cols-2 items-center"
          >
            <div className="text-center md:text-left">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-block mb-4"
              >
                <Bot className="h-16 w-16 text-primary" />
              </motion.div>
              <h1 className="mb-6 text-5xl font-extrabold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                {t('hero.title')}
              </h1>
              <p className="mb-8 text-xl text-muted-foreground leading-relaxed">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button
                  onClick={() => navigate('/login')}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow transition-all"
                >
                  {t('hero.getStarted')}
                </Button>
                <Button
                  onClick={() => navigate('/about-project')}
                  size="lg"
                  variant="outline"
                  className="border-primary/50 hover:bg-primary/10"
                >
                  {t('hero.learnMore')}
                </Button>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center"
            >
              <motion.img
                src={walleRobot}
                alt="Wall-E Robot"
                className="h-80 w-auto object-contain drop-shadow-2xl"
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold text-primary">{t('features.title')}</h2>
            <p className="text-lg text-muted-foreground">{t('features.subtitle')}</p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Camera, titleKey: 'features.realtime', descKey: 'features.realtimeDesc' },
              { icon: Zap, titleKey: 'features.fast', descKey: 'features.fastDesc' },
              { icon: Shield, titleKey: 'features.accurate', descKey: 'features.accurateDesc' },
              { icon: Bot, titleKey: 'features.autonomous', descKey: 'features.autonomousDesc' },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full border-primary/20 hover:border-primary/50 transition-all hover:shadow-card">
                  <CardContent className="p-6 text-center">
                    <feature.icon className="mx-auto mb-4 h-12 w-12 text-primary" />
                    <h3 className="mb-2 text-xl font-bold text-foreground">{t(feature.titleKey)}</h3>
                    <p className="text-muted-foreground">{t(feature.descKey)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
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
                  name="name"
                  placeholder={t('contact.name')}
                  className="bg-card border-border focus:border-primary"
                  required
                />
              </div>
              
              <div>
                <Input
                  name="email"
                  type="email"
                  placeholder={t('contact.email')}
                  className="bg-card border-border focus:border-primary"
                  required
                />
              </div>
              
              <div>
                <Textarea
                  name="message"
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
