import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import DetectCard from '@/components/DetectCard';
import Modal from '@/components/Modal';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeDetection } from '@/lib/detections';
import type { Detection, DetectionQueryResult, DetectionStatus } from '@/types/detection';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

const Dashboard = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | DetectionStatus>('all');

  const fetchDetections = useCallback(async () => {
    logger.debug('Dashboard', 'Fetching detections');
    setLoading(true);
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

      const normalized = (detectionsData ?? []).map((row) =>
        normalizeDetection(row as DetectionQueryResult)
      );

      setDetections(normalized);
      logger.info('Dashboard', `Loaded ${normalized.length} detections`);
    } catch (error) {
      logger.error('Dashboard', 'Error fetching detections', error);
      toast({
        title: t('common.error'),
        description: t('dashboard.loadError', { defaultValue: 'Failed to load detections' }),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    logger.info('Dashboard', 'Initializing dashboard page');
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
          logger.debug('Dashboard', 'Realtime INSERT received, refreshing detections');
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
  }, [fetchDetections, toast]);

  const filteredDetections = useMemo(() => {
    if (statusFilter === 'all') {
      return detections;
    }

    return detections.filter((detection) => detection.status === statusFilter);
  }, [detections, statusFilter]);

  const statusOptions: Array<{ value: 'all' | DetectionStatus; label: string }> = useMemo(
    () => [
      { value: 'all', label: t('dashboard.allStatuses', { defaultValue: 'All statuses' }) },
      { value: 'noObjects', label: t('dashboard.noObjects') },
      { value: 'healthy', label: t('dashboard.healthy') },
      { value: 'diseased', label: t('dashboard.diseased') },
      { value: 'mixed', label: t('dashboard.mixed') },
    ],
    [t],
  );

  const handleDetect = () => {
    logger.debug('Dashboard', 'Detect action triggered');
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {t('dashboard.filterByStatus', { defaultValue: 'Filter by status' })}
              </p>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  const nextFilter = value as 'all' | DetectionStatus;
                  logger.debug('Dashboard', `Status filter changed`, nextFilter);
                  setStatusFilter(nextFilter);
                }}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder={t('dashboard.allStatuses', { defaultValue: 'All statuses' })} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Card key={idx} className="p-6 space-y-4 bg-card">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </Card>
                ))}
              </div>
            ) : filteredDetections.length === 0 ? (
              <div className="text-center py-12 rounded-lg border border-dashed border-border">
                <p className="text-muted-foreground">
                  {t('dashboard.noDetections', {
                    defaultValue: 'No detections yet. Waiting for Raspberry Pi data...',
                  })}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDetections.map((detection, index) => (
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
