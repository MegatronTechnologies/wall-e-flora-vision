import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import DetectCard from '@/components/DetectCard';
import Modal from '@/components/Modal';
import { Upload } from 'lucide-react';

const Dashboard = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mockDetects = [
    { id: '#1023', date: '2025-01-15 14:32', status: 'diseased' as const },
    { id: '#1022', date: '2025-01-15 12:15', status: 'healthy' as const },
    { id: '#1021', date: '2025-01-14 16:45', status: 'mixed' as const },
    { id: '#1020', date: '2025-01-14 10:20', status: 'noObjects' as const },
  ];

  const handleDetect = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Main Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6 mb-16"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                onClick={handleDetect}
                className="bg-primary hover:bg-primary/90 text-2xl px-12 py-8 h-auto animate-glow"
              >
                {t('dashboard.detect')}
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="outline"
                size="lg"
                onClick={handleDetect}
                className="border-border hover:border-primary gap-2"
              >
                <Upload className="h-5 w-5" />
                {t('dashboard.upload')}
              </Button>
            </motion.div>
          </motion.div>

          {/* Previous Detects */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">{t('dashboard.previousDetects')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockDetects.map((detect, index) => (
                <DetectCard
                  key={detect.id}
                  id={detect.id}
                  date={detect.date}
                  status={detect.status}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('modal.inDevelopment')}
      >
        <div className="text-center py-8">
          <p className="text-lg text-muted-foreground">
            {t('modal.inDevelopment')}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
