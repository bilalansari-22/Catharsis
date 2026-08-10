/*
  # Fix foreign key constraints for user authentication

  1. Updated Tables
    - `profiles`: Added foreign key from user_id to auth.users.id
    - `journal_entries`: Changed user_id foreign key to reference auth.users.id
    - `appointments`: Changed user_id foreign key to reference auth.users.id
    - `chat_messages`: Changed user_id foreign key to reference auth.users.id

  2. Changes Made
    - Dropped existing foreign keys that referenced profiles.id
    - Added new foreign keys that reference auth.users.id directly
    - This ensures data integrity with Supabase Auth
  
  3. Important Notes
    - user_id columns now properly reference authenticated users
    - Cascade delete ensures user data is removed when account is deleted
*/

-- First, drop the existing foreign key constraints
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_user_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_user_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Add new foreign key constraints referencing auth.users
ALTER TABLE profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE journal_entries 
ADD CONSTRAINT journal_entries_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
