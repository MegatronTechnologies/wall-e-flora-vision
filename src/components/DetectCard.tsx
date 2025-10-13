import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card } from './ui/card';
import Modal from './Modal';

interface Detection {
  id: string;
  device_id: string;
  image_url: string;
  status: 'noObjects' | 'healthy' | 'diseased' | 'mixed';
  confidence: number | null;
  metadata: any;
  created_at: string;
  plant_images?: { image_url: string; order_num: number }[];
}

interface DetectCardProps {
  detection: Detection;
  index: number;
}

const DetectCard = ({ detection, index }: DetectCardProps) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const displayId = `#${detection.id.substring(0, 8)}`;
  const { status } = detection;
  const confidence = detection.confidence || 0;

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
              <span className="font-mono font-bold text-primary">{displayId}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t('dashboard.date')}
              </span>
              <span className="text-sm">{formatDate(detection.created_at)}</span>
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
        title={`${t('dashboard.details')} - ${displayId}`}
      >
        <div className="space-y-4">
          <div className="aspect-video bg-secondary rounded-lg overflow-hidden">
            {detection.image_url ? (
              <img 
                src={detection.image_url} 
                alt="Detection result" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No image available</p>
              </div>
            )}
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
              <p className="font-semibold text-primary">{confidence.toFixed(1)}%</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {detection.plant_images && detection.plant_images.length > 0 ? (
              detection.plant_images
                .sort((a, b) => a.order_num - b.order_num)
                .map((img) => (
                  <div key={img.order_num} className="aspect-square bg-secondary rounded-lg overflow-hidden">
                    <img 
                      src={img.image_url} 
                      alt={`Plant ${img.order_num}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))
            ) : (
              [1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-secondary rounded-lg flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">Plant {i}</p>
                </div>
              ))
            )}
          </div>
          
          {detection.metadata && Object.keys(detection.metadata).length > 0 && (
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Additional Info</p>
              <div className="text-sm space-y-1">
                {detection.metadata.temperature && (
                  <p>Temperature: {detection.metadata.temperature}°C</p>
                )}
                {detection.metadata.humidity && (
                  <p>Humidity: {detection.metadata.humidity}%</p>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default DetectCard;
