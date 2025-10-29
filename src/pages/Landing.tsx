import { useEffect } from 'react';
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
import { logger } from '@/lib/logger';
import { z } from 'zod';

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
            'Multiple chrysanthemums: mixed healthy/diseased — show separately within the card.',
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
            
            <div className="space-y-6 text-left max-w-3xl mx-auto">
              <p className="text-lg text-muted-foreground leading-relaxed text-center">
                {localized.intro}
              </p>

              <p className="text-center font-medium text-primary">
                {localized.competition}
              </p>

              {localized.sections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h3 className="text-2xl font-semibold text-center md:text-left">{section.title}</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
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
