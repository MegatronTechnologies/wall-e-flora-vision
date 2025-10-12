import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card } from './ui/card';
import Modal from './Modal';

interface DetectCardProps {
  id: string;
  date: string;
  status: 'noObjects' | 'healthy' | 'diseased' | 'mixed';
  confidence?: number;
  index: number;
}

const DetectCard = ({ id, date, status, confidence = 95, index }: DetectCardProps) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const statusColors = {
    noObjects: 'text-info',
    healthy: 'text-green-500',
    diseased: 'text-primary',
    mixed: 'text-yellow-500',
  };

  const statusBgColors = {
    noObjects: 'bg-info/10',
    healthy: 'bg-green-500/10',
    diseased: 'bg-primary/10',
    mixed: 'bg-yellow-500/10',
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => setIsModalOpen(true)}
        className="cursor-pointer"
      >
        <Card className="p-6 bg-card border-border hover:border-primary transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t('dashboard.detectId')}
              </span>
              <span className="font-mono font-bold text-primary">{id}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t('dashboard.date')}
              </span>
              <span className="text-sm">{date}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t('dashboard.status')}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[status]} ${statusBgColors[status]}`}
              >
                {t(`dashboard.${status}`)}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${t('dashboard.details')} - ${id}`}
      >
        <div className="space-y-4">
          <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Stream Image Placeholder</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">{t('dashboard.status')}</p>
              <p className={`font-semibold ${statusColors[status]}`}>
                {t(`dashboard.${status}`)}
              </p>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">{t('dashboard.confidence')}</p>
              <p className="font-semibold text-primary">{confidence}%</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-secondary rounded-lg flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Plant {i}</p>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DetectCard;
