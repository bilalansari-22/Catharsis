/*
  # Fix RLS policies for user authentication

  1. Updated Tables
    - `profiles`: Updated SELECT and UPDATE policies to restrict users to their own data
    - `appointments`: Added WITH CHECK to INSERT policy
    - `journal_entries`: Added WITH CHECK to INSERT policy
    - `chat_messages`: Added WITH CHECK to INSERT policy

  2. Security Changes
    - Profiles: Users can only view and update their own profile (user_id matches auth.uid())
    - All INSERT policies now have WITH CHECK constraints to ensure user_id matches auth.uid()
  
  3. Important Notes
    - These changes ensure proper data isolation between users
    - Each user can only access their own data
    - Therapists remain publicly viewable by all authenticated users
*/

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON profiles;

-- Create new profiles policies with proper user isolation
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Drop and recreate appointments INSERT policy with WITH CHECK
DROP POLICY IF EXISTS "Users can insert own appointments" ON appointments;

CREATE POLICY "Users can insert own appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Drop and recreate journal_entries INSERT policy with WITH CHECK
DROP POLICY IF EXISTS "Users can insert own journal entries" ON journal_entries;

CREATE POLICY "Users can insert own journal entries"
  ON journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Drop and recreate chat_messages INSERT policy with WITH CHECK
DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
