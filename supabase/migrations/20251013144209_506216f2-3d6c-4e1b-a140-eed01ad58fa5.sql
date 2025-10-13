-- Create enum for detection status
CREATE TYPE public.detection_status AS ENUM ('noObjects', 'healthy', 'diseased', 'mixed');

-- Create detections table
CREATE TABLE public.detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status public.detection_status NOT NULL,
  confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create detection_images table for additional plant images
CREATE TABLE public.detection_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detection_id UUID REFERENCES public.detections(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  order_num INTEGER NOT NULL CHECK (order_num >= 1 AND order_num <= 3),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(detection_id, order_num)
);

-- Enable RLS
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for detections table
CREATE POLICY "Public can view all detections"
  ON public.detections
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert detections"
  ON public.detections
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for detection_images table
CREATE POLICY "Public can view all detection images"
  ON public.detection_images
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert detection images"
  ON public.detection_images
  FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for detection images
INSERT INTO storage.buckets (id, name, public)
VALUES ('detection-images', 'detection-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for detection-images bucket
CREATE POLICY "Public can view detection images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'detection-images');

CREATE POLICY "Service role can upload detection images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'detection-images');

-- Create index for faster queries
CREATE INDEX idx_detections_created_at ON public.detections(created_at DESC);
CREATE INDEX idx_detections_device_id ON public.detections(device_id);
CREATE INDEX idx_detection_images_detection_id ON public.detection_images(detection_id);