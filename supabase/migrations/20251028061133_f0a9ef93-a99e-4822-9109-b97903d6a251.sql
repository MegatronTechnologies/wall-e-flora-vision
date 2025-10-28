-- Enable realtime for detections and detection_images tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.detections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.detection_images;