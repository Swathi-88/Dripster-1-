/*
  # Create DRIPSTER Database Schema

  1. New Tables
    - `clothing_items`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `size` (text)
      - `price_per_day` (numeric)
      - `images` (text array)
      - `owner_id` (uuid, foreign key to auth.users)
      - `available` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `rentals`
      - `id` (uuid, primary key)
      - `item_id` (uuid, foreign key to clothing_items)
      - `renter_id` (uuid, foreign key to auth.users)
      - `owner_id` (uuid, foreign key to auth.users)
      - `start_date` (date)
      - `end_date` (date)
      - `total_price` (numeric)
      - `status` (enum: pending, confirmed, active, completed, cancelled)
      - `created_at` (timestamp)

  2. Views
    - `users` view to access auth.users metadata

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Set up storage bucket policies for clothing images

  4. Functions
    - Auto-update timestamp function
*/

-- Create rental status enum
CREATE TYPE rental_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');

-- Create clothing_items table
CREATE TABLE IF NOT EXISTS public.clothing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  size text NOT NULL,
  price_per_day numeric NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create rentals table
CREATE TABLE IF NOT EXISTS public.rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.clothing_items(id) ON DELETE CASCADE NOT NULL,
  renter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_price numeric NOT NULL,
  status rental_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT check_dates CHECK (end_date >= start_date)
);

-- Create users view to access auth.users metadata
CREATE OR REPLACE VIEW public.users AS
SELECT
  id,
  email,
  raw_user_meta_data ->> 'full_name' AS full_name,
  raw_user_meta_data ->> 'phone' AS phone,
  created_at
FROM auth.users;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for clothing_items table
DROP TRIGGER IF EXISTS update_clothing_items_updated_at ON public.clothing_items;
CREATE TRIGGER update_clothing_items_updated_at
BEFORE UPDATE ON public.clothing_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.users ENABLE ROW LEVEL SECURITY;

-- Clothing items policies
CREATE POLICY "Users can view all clothing items"
  ON public.clothing_items
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own clothing items"
  ON public.clothing_items
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own clothing items"
  ON public.clothing_items
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own clothing items"
  ON public.clothing_items
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Rentals policies
CREATE POLICY "Users can view their own rentals"
  ON public.rentals
  FOR SELECT
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "Users can insert rentals"
  ON public.rentals
  FOR INSERT
  WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Users can update their own rentals or items they own"
  ON public.rentals
  FOR UPDATE
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Users view policy
CREATE POLICY "Allow authenticated users to view public user data"
  ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Storage bucket setup (this needs to be run manually in Supabase dashboard)
-- Create bucket 'clothing-images' with public access
-- Then run these policies:

-- INSERT POLICY for storage
-- CREATE POLICY "Allow authenticated users to upload images"
-- ON storage.objects
-- FOR INSERT
-- WITH CHECK (bucket_id = 'clothing-images' AND auth.role() = 'authenticated');

-- SELECT POLICY for storage  
-- CREATE POLICY "Allow authenticated users to view images"
-- ON storage.objects
-- FOR SELECT
-- USING (bucket_id = 'clothing-images' AND auth.role() = 'authenticated');

-- DELETE POLICY for storage
-- CREATE POLICY "Allow users to delete their own images"
-- ON storage.objects
-- FOR DELETE
-- USING (bucket_id = 'clothing-images' AND auth.role() = 'authenticated');