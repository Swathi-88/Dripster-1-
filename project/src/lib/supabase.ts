import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enhanced error handler for database operations
export const handleDatabaseError = (error: any) => {
  if (error?.code === 'PGRST205' || 
      error?.message?.includes('Could not find the table') ||
      error?.message?.includes('schema cache')) {
    return {
      isSchemaError: true,
      message: 'Database tables not found. Please set up the database schema in your Supabase project.'
    };
  }
  return {
    isSchemaError: false,
    message: error?.message || 'An error occurred'
  };
};

// Helper function to validate SSN email domain
export const isValidSSNEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@ssn.edu.in');
};

// Helper function to upload image
export const uploadImage = async (file: File, path: string) => {
  const { data, error } = await supabase.storage
    .from('clothing-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return data;
};

// Helper function to get public URL for image
export const getImageUrl = (path: string) => {
  const { data } = supabase.storage
    .from('clothing-images')
    .getPublicUrl(path);
  
  return data.publicUrl;
};