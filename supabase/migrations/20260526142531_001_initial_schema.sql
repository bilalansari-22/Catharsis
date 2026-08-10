/*
  # Catharsis Mental Health Application Schema

  1. New Tables
    - `profiles`: User profile information
      - `id` (uuid, primary key, references auth.users)
      - `name` (text, user's display name)
      - `created_at` (timestamp)
    
    - `journal_entries`: Mental health journal entries
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `mood_type` (text, emotional state label)
      - `mood_score` (integer, 0-100)
      - `content` (text, journal entry text)
      - `sentiment` (text, AI-detected sentiment)
      - `severity` (text, low/moderate/high)
      - `created_at` (timestamp)
    
    - `therapists`: Professional therapist profiles
      - `id` (uuid, primary key)
      - `name` (text)
      - `specialty` (text)
      - `rating` (decimal)
      - `experience_years` (integer)
      - `hourly_rate` (decimal)
      - `avatar_url` (text)
      - `bio` (text)
    
    - `appointments`: Scheduled therapy sessions
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `therapist_id` (uuid, foreign key to therapists)
      - `scheduled_at` (timestamp)
      - `status` (text, pending/confirmed/completed/cancelled)
      - `share_journal` (boolean, consent to share journal data)
      - `created_at` (timestamp)
    
    - `chat_messages`: Companion chat history
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `role` (text, user/assistant)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Student',
  created_at timestamptz DEFAULT now()
);

-- Create journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mood_type text NOT NULL,
  mood_score integer NOT NULL CHECK (mood_score >= 0 AND mood_score <= 100),
  content text NOT NULL,
  sentiment text DEFAULT 'neutral',
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'moderate', 'high')),
  created_at timestamptz DEFAULT now()
);

-- Create therapists table
CREATE TABLE IF NOT EXISTS therapists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text NOT NULL,
  rating decimal(3,2) DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
  experience_years integer DEFAULT 5,
  hourly_rate decimal(10,2) DEFAULT 100.00,
  avatar_url text DEFAULT 'https://images.pexels.com/photo3782189/pexels-photo3782189.jpeg',
  bio text DEFAULT 'Experienced mental health professional.'
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  share_journal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies (for demo, allow all authenticated access)
CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Journal entries policies
CREATE POLICY "Users can view own journal entries"
  ON journal_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
  ON journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON journal_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Therapists policies (public read for all)
CREATE POLICY "Anyone can view therapists"
  ON therapists FOR SELECT
  TO authenticated
  USING (true);

-- Appointments policies
CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Insert sample therapists
INSERT INTO therapists (name, specialty, rating, experience_years, hourly_rate, avatar_url, bio) VALUES
('Dr. Amina Siddiqui', 'Clinical Psychology', 4.9, 12, 150.00, 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg', 'Specializes in anxiety, depression, and trauma recovery with a compassionate approach.'),
('Dr. Marcus Chen', 'Cognitive Behavioral Therapy', 4.7, 8, 130.00, 'https://images.pexels.com/photos/3782189/pexels-photo-3782189.jpeg', 'Expert in CBT techniques for stress management and behavioral change.'),
('Dr. Priya Sharma', 'Mindfulness-Based Therapy', 4.8, 10, 140.00, 'https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg', 'Integrates mindfulness practices with traditional therapy for holistic healing.'),
('Dr. James Wilson', 'Youth Counseling', 4.6, 6, 120.00, 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg', 'Specialized in adolescent mental health and academic stress management.')
ON CONFLICT DO NOTHING;