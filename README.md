Catharsis

Catharsis is a full-stack mental health journaling app that combines mood tracking, AI-powered reflection, and access to professional support in one place.

Features
• Mood tracking — log and visualize mood patterns over time
• AI reflection — journal entries analyzed and reflected on using Google Gemini
• Voice-to-text journaling — speak your entries instead of typing
• Psychologist booking — schedule sessions with licensed psychologists
• Therapist note sharing — share journal insights securely with your therapist
• Companion chat — AI-powered conversational support.

Getting Started

1. Clone the repo
bash
git clone https://github.com/your-username/catharsis.git
cd catharsis
2. Install dependencies
bash
npm install
3. Set up environment variables

Copy the example env file and fill in your own keys:

bash
cp .env.example .env

You'll need:

VITE_SUPABASE_URL — your Supabase project URL
VITE_SUPABASE_ANON_KEY — your Supabase anon/public key
VITE_GEMINI_API_KEY — your Google Gemini API key
4. Set up the database

Run the SQL migrations in supabase/migrations/ against your Supabase project (in order) to set up the schema, RLS policies, and profile fields.

5. Run locally
bash
npm run dev
The app will be available at http://localhost:5173.

Project Structure

project/
├── src/
│   ├── components/       # Reusable UI components (e.g. AuthScreen)
│   ├── pages/             # App pages (e.g. Profile)
│   ├── App.tsx            # Main app component
│   └── main.tsx           # App entry point
├── supabase/
│   ├── functions/         # Edge functions (e.g. companion-chat)
│   └── migrations/        # Database schema & RLS migrations
├── public/                 # Static assets
└── .env.example            # Environment variable template

Scripts

Command	                           Description
npm run dev	                       Start local dev server
npm run build	                     Build for production
npm run preview	                   Preview production build
npm run lint	                     Run ESLint
npm run typecheck	                 Run TypeScript type checking
















