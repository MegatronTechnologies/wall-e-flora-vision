import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone } from "lucide-react";
import megtechLogo from "@/assets/megtech-logo.png";
import aydinPhoto from "@/assets/aydin-sulxayev.jpg";
import nihatPhoto from "@/assets/nihat-muradli-new.jpg";

const AboutUs = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 md:mb-16 text-center"
        >
          <h1 className="mb-3 md:mb-4 text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("aboutUs.title")}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
            {t("aboutUs.subtitle")}
          </p>
        </motion.div>

        {/* Team Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 md:mb-16"
        >
          <Card className="overflow-hidden bg-white dark:bg-card border-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardContent className="p-6 sm:p-8 md:p-12">
              <div className="flex flex-col items-center gap-6 md:gap-10 lg:flex-row lg:gap-12">
                <motion.div 
                  className="flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <img
                    src={megtechLogo}
                    alt="MegTech Logo"
                    className="h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56 object-contain drop-shadow-lg"
                  />
                </motion.div>
                <div className="flex-1 text-center lg:text-left">
                  <h2 className="mb-4 md:mb-6 text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {t("aboutUs.team.title")}
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-gray-900 dark:text-foreground mb-3 md:mb-4">
                    {t("aboutUs.team.description")}
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed text-gray-900 dark:text-foreground">
                    {t("aboutUs.team.mission")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Team Members */}
        <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto">
          {/* Nihat */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-primary/20">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 sm:mb-6 flex justify-center">
                  <img
                    src={nihatPhoto}
                    alt="Nihat Muradlı"
                    className="h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64 rounded-lg object-cover shadow-lg"
                  />
                </div>
                <h3 className="mb-2 text-xl sm:text-2xl font-bold text-primary">
                  {t("aboutUs.nihat.name")}
                </h3>
                <p className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-muted-foreground">
                  {t("aboutUs.nihat.role")}
                </p>
                <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed text-foreground">
                  {t("aboutUs.nihat.intro")}
                </p>
                <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed text-foreground">
                  {t("aboutUs.nihat.technical")}
                </p>
                <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed text-foreground">
                  {t("aboutUs.nihat.business")}
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-foreground">
                  {t("aboutUs.nihat.goal")}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Aydin */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full border-primary/20">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 sm:mb-6 flex justify-center">
                  <img
                    src={aydinPhoto}
                    alt="Aydın Sulxayev"
                    className="h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64 rounded-lg object-cover shadow-lg"
                  />
                </div>
                <h3 className="mb-2 text-xl sm:text-2xl font-bold text-primary">
                  {t("aboutUs.aydin.name")}
                </h3>
                <p className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-muted-foreground">
                  {t("aboutUs.aydin.role")}
                </p>
                <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed text-foreground">
                  {t("aboutUs.aydin.intro")}
                </p>
                <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed text-foreground">
                  {t("aboutUs.aydin.technical")}
                </p>
                <p className="mb-2 sm:mb-3 text-sm sm:text-base leading-relaxed text-foreground">
                  {t("aboutUs.aydin.innovation")}
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-foreground">
                  {t("aboutUs.aydin.goal")}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Contact Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 md:mt-16"
        >
          <Card className="border-primary/20">
            <CardContent className="p-6 sm:p-8">
              <h2 className="mb-4 sm:mb-6 text-center text-2xl sm:text-3xl font-bold text-primary">
                {t("aboutUs.contact.title")}
              </h2>
              <div className="flex flex-col items-center gap-3 sm:gap-4 md:flex-row md:justify-center md:gap-8">
                <a
                  href="mailto:megtech.info@gmail.com"
                  className="flex items-center gap-2 text-sm sm:text-base md:text-lg text-foreground transition-colors hover:text-primary break-all"
                >
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="text-center">megtech.info@gmail.com</span>
                </a>
                <a
                  href="tel:+994553390202"
                  className="flex items-center gap-2 text-sm sm:text-base md:text-lg text-foreground transition-colors hover:text-primary"
                >
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span>+994 55 339 02 02</span>
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
