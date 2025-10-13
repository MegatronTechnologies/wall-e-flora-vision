import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import DetectCard from '@/components/DetectCard';
import Modal from '@/components/Modal';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

const Dashboard = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetections();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('detections-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'detections'
        },
        () => {
          fetchDetections();
          toast({
            title: 'New detection received',
            description: 'A new detection has been added from Raspberry Pi',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDetections = async () => {
    try {
      const { data: detectionsData, error } = await supabase
        .from('detections')
        .select(`
          *,
          plant_images:detection_images(image_url, order_num)
        `)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      setDetections(detectionsData || []);
    } catch (error) {
      console.error('Error fetching detections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load detections',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
            
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </div>
            ) : detections.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No detections yet. Waiting for Raspberry Pi data...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {detections.map((detection, index) => (
                  <DetectCard
                    key={detection.id}
                    detection={detection}
                    index={index}
                  />
                ))}
              </div>
            )}
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
