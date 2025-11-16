import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Camera, Cpu, Leaf, AlertCircle, CheckCircle } from "lucide-react";
import walleRobot from "@/assets/wall-e-robot.png";

const AboutProject = () => {
  const { t } = useTranslation();

  const features = [
    { icon: Bot, titleKey: "aboutProject.features.robot" },
    { icon: Camera, titleKey: "aboutProject.features.camera" },
    { icon: Cpu, titleKey: "aboutProject.features.ai" },
    { icon: Leaf, titleKey: "aboutProject.features.detection" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section with Wall-E */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12 md:text-left">
            <motion.div 
              className="flex-shrink-0"
              whileHover={{ scale: 1.05, rotate: 2 }}
              transition={{ duration: 0.3 }}
            >
              <img
                src={walleRobot}
                alt="Wall-E Robot"
                className="h-64 w-auto object-contain drop-shadow-2xl"
              />
            </motion.div>
            <div className="flex-1">
              <h1 className="mb-4 text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                {t("aboutProject.title")}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {t("aboutProject.subtitle")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main Description */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <Card className="border-primary/20 shadow-lg">
            <CardContent className="p-8">
              <div className="space-y-6">
                <p className="text-lg leading-relaxed text-foreground">
                  {t("aboutProject.description.intro")}
                </p>
                <p className="text-lg leading-relaxed text-foreground">
                  {t("aboutProject.description.technology")}
                </p>
                <p className="text-lg leading-relaxed text-foreground">
                  {t("aboutProject.description.aiCore")}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Features Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="mb-8 text-center text-3xl font-bold text-primary">
            {t("aboutProject.featuresTitle")}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full border-primary/20 bg-card hover:border-primary/50 transition-all">
                  <CardContent className="p-6 text-center">
                    <feature.icon className="mx-auto mb-4 h-12 w-12 text-primary" />
                    <p className="text-base font-semibold text-foreground">
                      {t(feature.titleKey)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How It Works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <Card className="border-primary/20 shadow-lg">
            <CardContent className="p-8">
              <h2 className="mb-6 text-3xl font-bold text-primary">
                {t("aboutProject.howItWorksTitle")}
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    1
                  </div>
                  <p className="text-lg text-foreground">
                    {t("aboutProject.howItWorks.step1")}
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    2
                  </div>
                  <p className="text-lg text-foreground">
                    {t("aboutProject.howItWorks.step2")}
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    3
                  </div>
                  <p className="text-lg text-foreground">
                    {t("aboutProject.howItWorks.step3")}
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    4
                  </div>
                  <p className="text-lg text-foreground">
                    {t("aboutProject.howItWorks.step4")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Impact & Goals */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="p-8">
                <div className="mb-4 flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-primary" />
                  <h3 className="text-2xl font-bold text-primary">
                    {t("aboutProject.goalsTitle")}
                  </h3>
                </div>
                <p className="text-lg leading-relaxed text-foreground">
                  {t("aboutProject.goals")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-lg">
              <CardContent className="p-8">
                <div className="mb-4 flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-primary" />
                  <h3 className="text-2xl font-bold text-primary">
                    {t("aboutProject.impactTitle")}
                  </h3>
                </div>
                <p className="text-lg leading-relaxed text-foreground">
                  {t("aboutProject.impact")}
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.section>

        {/* Future Vision */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50 shadow-xl">
            <CardContent className="p-8 text-center">
              <Bot className="mx-auto mb-4 h-16 w-16 text-primary" />
              <h2 className="mb-4 text-3xl font-bold text-primary">
                {t("aboutProject.futureTitle")}
              </h2>
              <p className="text-lg leading-relaxed text-foreground max-w-3xl mx-auto">
                {t("aboutProject.future")}
              </p>
            </CardContent>
          </Card>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutProject;
