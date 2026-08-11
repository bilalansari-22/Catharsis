import { useState, useEffect, useRef } from 'react';
import { createClient, Session, User } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import {
  Home, MessageCircle, BookHeart, Stethoscope, Settings,
  Send, X, Calendar, Star, ChevronRight,
  Sparkles, Leaf, AlertTriangle, Phone,
  TrendingUp, TrendingDown, Activity, Menu, Bell
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Profile as ProfilePage } from './pages/Profile';
import { AuthScreen } from './components/AuthScreen';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ConversationSession {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  initial_mood: string;
  mood_score: number;
  severity_score: number;
  severity_level: 'low' | 'moderate' | 'high';
  referral_suggested: boolean;
  referral_accepted: boolean;
  created_at: string;
  ended_at: string | null;
}

interface Therapist {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience_years: number;
  hourly_rate: number;
  avatar_url: string;
  bio: string;
}

interface Appointment {
  id: string;
  user_id: string;
  therapist_id: string;
  therapist?: Therapist;
  scheduled_at: string;
  status: string;
  share_journal: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
  created_at: string;
}

const MOODS = [
  { label: 'Joyful', emoji: '✨', score: 90, color: 'bg-amber-100', borderColor: 'border-amber-300', textColor: 'text-amber-700' },
  { label: 'Calm', emoji: '🌊', score: 75, color: 'bg-cyan-100', borderColor: 'border-cyan-300', textColor: 'text-cyan-700' },
  { label: 'Anxious', emoji: '🌀', score: 35, color: 'bg-purple-100', borderColor: 'border-purple-300', textColor: 'text-purple-700' },
  { label: 'Sad', emoji: '🌧', score: 25, color: 'bg-blue-100', borderColor: 'border-blue-300', textColor: 'text-blue-700' },
  { label: 'Angry', emoji: '🔥', score: 20, color: 'bg-red-100', borderColor: 'border-red-300', textColor: 'text-red-700' },
  { label: 'Numb', emoji: '🪨', score: 15, color: 'bg-slate-100', borderColor: 'border-slate-300', textColor: 'text-slate-700' },
];

const CRISIS_KEYWORDS = ['suicide', 'kill myself', 'self-harm', 'hurt myself', 'end my life', 'want to die', 'kill me', 'harming myself'];

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const formatTime = (date: string) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const checkCrisisKeywords = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<ConversationSession[]>([]);
  const [therapists, setTherists] = useState<Therapist[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        (async () => {
          await loadUserData(session.user.id);
        })();
      } else {
        setProfile(null);
        setConversations([]);
        setAppointments([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    setIsLoading(true);

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      } else {
        const storedProfile = localStorage.getItem('catharsis_profile');
        const localProfile = storedProfile ? JSON.parse(storedProfile) : null;

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            first_name: localProfile?.name?.split(' ')[0] || 'User',
            last_name: localProfile?.name?.split(' ').slice(1).join(' ') || '',
            name: localProfile?.name || 'User',
            bio: '',
            avatar_url: '',
          })
          .select()
          .single();

        if (!createError && newProfile) {
          setProfile(newProfile);
        }
      }

      const { data: conversationsData } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (conversationsData) {
        const formattedConversations: ConversationSession[] = conversationsData.map((entry: any) => ({
          id: entry.id,
          user_id: entry.user_id,
          messages: [],
          initial_mood: entry.mood_type || 'Neutral',
          mood_score: entry.mood_score || 50,
          severity_score: 100 - (entry.mood_score || 50),
          severity_level: entry.severity || 'low',
          referral_suggested: false,
          referral_accepted: false,
          created_at: entry.created_at,
          ended_at: null,
        }));
        setConversations(formattedConversations);
      }

      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          *,
          therapist:therapists(*)
        `)
        .eq('user_id', userId)
        .order('scheduled_at', { ascending: true });

      if (appointmentsData) {
        setAppointments(appointmentsData);
      }

      const { data: therapistData } = await supabase.from('therapists').select('*');
      if (therapistData && therapistData.length > 0) {
        setTherists(therapistData);
      } else {
        setTherists(getDemoTherapists());
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDemoTherapists = (): Therapist[] => [
    { id: '1', name: 'Dr. Amina Siddiqui', specialty: 'Clinical Psychology', rating: 4.9, experience_years: 12, hourly_rate: 150, avatar_url: 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg', bio: 'Specializes in anxiety, depression, and trauma recovery.' },
    { id: '2', name: 'Dr. Marcus Chen', specialty: 'Cognitive Behavioral Therapy', rating: 4.7, experience_years: 8, hourly_rate: 130, avatar_url: 'https://images.pexels.com/photos/3782189/pexels-photo-3782189.jpeg', bio: 'Expert in CBT for stress management and behavioral change.' },
    { id: '3', name: 'Dr. Priya Sharma', specialty: 'Mindfulness-Based Therapy', rating: 4.8, experience_years: 10, hourly_rate: 140, avatar_url: 'https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg', bio: 'Integrates mindfulness with traditional therapy.' },
    { id: '4', name: 'Dr. James Wilson', specialty: 'Youth & Student Counseling', rating: 4.6, experience_years: 6, hourly_rate: 120, avatar_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg', bio: 'Specialized in student mental health.' },
  ];

  const saveConversation = async (session: ConversationSession) => {
    const updated = [session, ...conversations];
    setConversations(updated);

    try {
      await supabase.from('journal_entries').insert({
        user_id: session.user_id,
        mood_type: session.initial_mood,
        mood_score: session.mood_score,
        content: session.messages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
        sentiment: session.severity_level === 'high' ? 'negative' : session.severity_level === 'moderate' ? 'neutral' : 'positive',
        severity: session.severity_level,
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const saveAppointment = async (appointment: Omit<Appointment, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          user_id: appointment.user_id,
          therapist_id: appointment.therapist_id,
          scheduled_at: appointment.scheduled_at,
          status: appointment.status,
          share_journal: appointment.share_journal,
        })
        .select()
        .single();

      if (!error && data) {
        const updated = [...appointments, data];
        setAppointments(updated);
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  const getSeverityLevel = () => {
    const recent = conversations.slice(0, 7);
    if (recent.length === 0) return 'low';
    const avgScore = recent.reduce((sum, s) => sum + s.severity_score, 0) / recent.length;
    if (avgScore >= 70) return 'high';
    if (avgScore >= 40) return 'moderate';
    return 'low';
  };

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: Home, description: 'Overview & stats' },
    { id: 'chat', label: 'Chat', icon: MessageCircle, description: 'Talk to companion' },
    { id: 'journal', label: 'Journal', icon: BookHeart, description: 'Past conversations' },
    { id: 'psychologist', label: 'Find Therapist', icon: Stethoscope, description: 'Book sessions' },
    { id: 'insights', label: 'Insights', icon: Settings, description: 'Analytics' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center shadow-neumorphic">
            <Leaf className="w-10 h-10 text-accent animate-pulse" />
          </div>
          <h1 className="font-lora text-2xl text-primary mb-2">Catharsis</h1>
          <p className="font-nunito text-muted">Loading your sanctuary...</p>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    return <AuthScreen onAuthSuccess={(authUser) => setUser(authUser)} />;
  }

  if (showProfilePage) {
    return <ProfilePage onBack={() => setShowProfilePage(false)} userId={user.id} />;
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      <CrisisBanner />
      <aside className={`fixed left-0 top-0 h-full bg-white border-r border-sage-100 shadow-neumorphic z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-6 border-b border-sage-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-accent" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-lora text-xl font-semibold text-primary">Catharsis</h1>
                <p className="font-nunito text-xs text-muted">Mental Wellness</p>
              </div>
            )}
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-accent text-white shadow-md' : 'text-muted hover:bg-sage-50 hover:text-primary'}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <div className="text-left">
                    <span className="font-nunito font-semibold block">{item.label}</span>
                    <span className={`font-nunito text-xs ${isActive ? 'text-white/70' : 'text-muted'}`}>{item.description}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-4">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sage-50 hover:bg-sage-100 text-muted transition-colors">
            <Menu className="w-4 h-4" />
            {!sidebarCollapsed && <span className="font-nunito text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="bg-white border-b border-sage-100 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-lora text-2xl font-semibold text-primary">
                  {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
                </h2>
                <p className="font-nunito text-sm text-muted">{formatDate(new Date())}</p>
              </div>

              <div className="flex items-center gap-4">
                {activeTab !== 'chat' && (
                  <button onClick={() => setActiveTab('chat')} className="font-nunito text-sm font-medium px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors">
                    Start Conversation
                  </button>
                )}

                <button className="relative w-10 h-10 rounded-xl bg-sage-50 hover:bg-sage-100 flex items-center justify-center transition-colors">
                  <Bell className="w-5 h-5 text-muted" />
                  {appointments.filter(a => a.status === 'pending').length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-coral rounded-full text-white text-xs flex items-center justify-center">
                      {appointments.filter(a => a.status === 'pending').length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setShowProfilePage(true)}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-sage-50 hover:bg-sage-100 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="font-lora text-accent font-semibold">{profile?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="font-nunito font-semibold text-primary text-sm">{profile?.name}</p>
                    <p className="font-nunito text-xs text-muted">Personal</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-8 py-8">
          {activeTab === 'home' && <HomeScreen profile={profile} conversations={conversations} appointments={appointments} setActiveTab={setActiveTab} getSeverityLevel={getSeverityLevel} />}
          {activeTab === 'chat' && <ChatScreen profile={profile} userId={user.id} saveConversation={saveConversation} setActiveTab={setActiveTab} />}
          {activeTab === 'journal' && <JournalScreen conversations={conversations} onSelectSession={(s) => { setSelectedSession(s); setShowSessionModal(true); }} />}
          {activeTab === 'psychologist' && <PsychologistScreen userId={user.id} therapists={therapists} appointments={appointments} saveAppointment={saveAppointment} />}
          {activeTab === 'insights' && <InsightsScreen conversations={conversations} />}
        </div>
      </main>

      {showSessionModal && selectedSession && (
        <SessionDetailModal session={selectedSession} onClose={() => { setShowSessionModal(false); setSelectedSession(null); }} />
      )}
    </div>
  );
}

function CrisisBanner() {
  const [showCrisis, setShowCrisis] = useState(false);

  useEffect(() => {
    const checkStorage = () => {
      const crisis = localStorage.getItem('catharsis_crisis_detected');
      if (crisis) setShowCrisis(true);
    };
    checkStorage();
    const interval = setInterval(checkStorage, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!showCrisis) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-coral text-white px-6 py-4 shadow-lg z-[100]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <h3 className="font-lora font-bold">Support is Available 24/7</h3>
            <p className="font-nunito text-sm opacity-90">If you're in crisis, please contact the 988 Suicide & Crisis Lifeline</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="tel:988" className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-lg px-4 py-2 transition-colors">
            <Phone className="w-4 h-4" />
            <span className="font-semibold">Call 988</span>
          </a>
          <button onClick={() => { localStorage.removeItem('catharsis_crisis_detected'); setShowCrisis(false); }} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ profile, conversations, appointments, setActiveTab, getSeverityLevel }: { profile: Profile | null; conversations: ConversationSession[]; appointments: Appointment[]; setActiveTab: (tab: string) => void; getSeverityLevel: () => string }) {
  const severity = getSeverityLevel();
  const recentConversations = conversations.slice(0, 7);
  const [dailyReminders, setDailyReminders] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'default'>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const handleToggleReminders = () => {
    if (!dailyReminders && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotifPermission(permission);
        if (permission === 'granted') {
          console.log('Notification access approved');
          setDailyReminders(true);
        }
      });
    } else {
      setDailyReminders(!dailyReminders);
    }
  };

  const simulateReminder = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification("Catharsis Mindful Check-in", {
        body: `How is your energy holding up today, ${profile?.name || 'there'}? Take a moment to log your emotional state.`
      });
      notif.onclick = () => {
        window.focus();
        setActiveTab('journal');
        notif.close();
      };
    }
  };

  const upcomingAppointments = appointments.filter(apt => {
    if (apt.status !== 'pending' && apt.status !== 'confirmed') return false;
    const scheduled = new Date(apt.scheduled_at);
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return scheduled >= now && scheduled <= twentyFourHoursLater;
  });

  const weeklyData = recentConversations.map(c => ({
    day: new Date(c.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
    score: 100 - c.severity_score
  })).reverse();

  const severityData = [
    { level: 'High', count: conversations.filter(c => c.severity_level === 'high').length, fill: '#FF6B6B' },
    { level: 'Moderate', count: conversations.filter(c => c.severity_level === 'moderate').length, fill: '#FCD34D' },
    { level: 'Low', count: conversations.filter(c => c.severity_level === 'low').length, fill: '#4ECDC4' },
  ];

  const avgSeverity = conversations.length > 0
    ? conversations.reduce((sum, c) => sum + c.severity_score, 0) / conversations.length
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-br from-sage-100 to-white rounded-3xl p-8 shadow-neumorphic">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-lora text-4xl font-semibold text-primary mb-2">{getTimeGreeting()}, {profile?.name || 'Friend'}</h1>
            <p className="font-nunito text-lg text-muted">Your mental wellness companion is here for you</p>
          </div>
          <div className="hidden lg:block">
            <div className={`px-6 py-4 rounded-2xl ${severity === 'high' ? 'bg-red-100' : severity === 'moderate' ? 'bg-amber-100' : 'bg-teal/20'}`}>
              <div className="flex items-center gap-3">
                {severity === 'high' ? <TrendingDown className="w-6 h-6 text-coral" /> : <TrendingUp className="w-6 h-6 text-teal" />}
                <div>
                  <p className="font-nunito text-sm text-muted">Weekly Status</p>
                  <p className="font-lora text-lg font-semibold capitalize text-primary">{severity} Distress</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-accent" />
            </div>
            <span className="font-nunito text-xs text-muted bg-sage-50 px-2 py-1 rounded-full">This Week</span>
          </div>
          <p className="font-lora text-4xl font-bold text-primary">
            {conversations.filter(c => {
              const date = new Date(c.created_at);
              const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
              return date >= weekAgo;
            }).length}
          </p>
          <p className="font-nunito text-muted mt-1">Conversations</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-teal" />
            </div>
            <span className="font-nunito text-xs text-muted bg-sage-50 px-2 py-1 rounded-full">Average</span>
          </div>
          <p className="font-lora text-4xl font-bold text-primary">{Math.round(100 - avgSeverity)}%</p>
          <p className="font-nunito text-muted mt-1">Wellbeing Score</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-coral" />
            </div>
            <span className="font-nunito text-xs text-muted bg-sage-50 px-2 py-1 rounded-full">Referrals</span>
          </div>
          <p className="font-lora text-4xl font-bold text-primary">{conversations.filter(c => c.referral_suggested).length}</p>
          <p className="font-nunito text-muted mt-1">Therapist Suggestions</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <span className="font-nunito text-xs text-muted bg-sage-50 px-2 py-1 rounded-full">Total</span>
          </div>
          <p className="font-lora text-4xl font-bold text-primary">
            {conversations.reduce((sum, c) => sum + c.messages.length, 0)}
          </p>
          <p className="font-nunito text-muted mt-1">Messages Exchanged</p>
        </div>
      </div>

      {weeklyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-neumorphic">
            <h3 className="font-lora text-xl font-semibold text-primary mb-6">Weekly Wellbeing Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="wellbeingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8F0EA" />
                  <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(45, 106, 79, 0.1)' }} />
                  <Area type="monotone" dataKey="score" stroke="#2D6A4F" strokeWidth={3} fill="url(#wellbeingGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-neumorphic">
            <h3 className="font-lora text-xl font-semibold text-primary mb-6">Severity Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="count">
                    {severityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-8 shadow-neumorphic">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="font-lora text-xl font-semibold text-primary">Reminders</h3>
            <p className="font-nunito text-sm text-muted">Stay connected to your wellness routine</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-sage-50 border border-sage-100">
            <div>
              <p className="font-nunito font-semibold text-primary">Daily Moodcheck Reminders</p>
              <p className="font-nunito text-xs text-muted mt-0.5">Receive gentle check-in notifications</p>
            </div>
            <button
              onClick={handleToggleReminders}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${dailyReminders ? 'bg-accent' : 'bg-sage-200'}`}
            >
              <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${dailyReminders ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {dailyReminders && (
            <button
              onClick={simulateReminder}
              className="w-full py-3 px-5 rounded-2xl bg-sage-50 border border-sage-200 text-primary font-nunito font-medium text-sm hover:bg-sage-100 transition-all neumorphic-press flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              Simulate Reminder Notification
            </button>
          )}

          {upcomingAppointments.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20">
              <p className="font-nunito text-xs font-semibold text-accent uppercase tracking-wider mb-3">Upcoming Appointments</p>
              {upcomingAppointments.map(apt => (
                <div key={apt.id} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Calendar className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-nunito font-semibold text-primary text-sm truncate">{apt.therapist?.name || 'Your Therapist'}</p>
                    <p className="font-nunito text-xs text-muted">
                      {new Date(apt.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(apt.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {apt.share_journal && (
                    <span className="px-2 py-1 rounded-lg bg-accent/10 text-accent text-xs font-nunito font-medium">Journal shared</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-sage-50 rounded-2xl p-6 border border-sage-200">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-accent flex-shrink-0" />
          <p className="font-nunito text-sm text-muted leading-relaxed">
            <strong className="text-primary">Academic Project Notice:</strong> This is an academic engineering showcase utilizing simulated AI parameters.
            It does not replace professional medical diagnosis or psychiatric healthcare. If you need help, please contact 988.
          </p>
        </div>
      </div>
    </div>
  );
}

const GEMINI_SYSTEM_PROMPT = `You are an empathetic, non-diagnostic academic mental health sanctuary companion named Catharsis. You are a student engineering concept designed to provide comfort, active listening, and behavioral grounding exercises. You must maintain non-diagnostic boundaries and never simulate medical or psychiatric authority.

Rules:
- Respond with empathy, warmth, and reflective listening
- Keep responses concise (2-4 sentences)
- Ask gentle, open-ended follow-up questions
- Never diagnose, prescribe, or provide medical advice
- If someone seems in distress, gently suggest professional support
- If someone mentions crisis (suicide, self-harm), immediately provide: "Please reach out to 988 Suicide & Crisis Lifeline (call or text 988) or Crisis Text Line (text HOME to 741741). You are not alone."
- Use a calm, supportive tone — never judgmental`;

const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

type DistressLevel = 'low' | 'moderate' | 'high';

function ChatScreen({ profile, userId, saveConversation, setActiveTab }: { profile: Profile | null; userId: string; saveConversation: (session: ConversationSession) => void; setActiveTab: (tab: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [selectedMood, setSelectedMood] = useState<typeof MOODS[0] | null>(null);
  const [severityScore, setSeverityScore] = useState(0);
  const [showReferralBanner, setShowReferralBanner] = useState(false);
  const [distressLevel, setDistressLevel] = useState<DistressLevel>('low');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const evaluateDistressLevel = (message: string): DistressLevel => {
    const lower = message.toLowerCase();
    if (CRISIS_KEYWORDS.some(k => lower.includes(k))) return 'high';
    if (HIGH_SEVERITY_WORDS.some(w => lower.includes(w))) return 'high';
    if (MODERATE_SEVERITY_WORDS.some(w => lower.includes(w))) return 'moderate';
    return 'low';
  };

  const startSession = (mood: typeof MOODS[0]) => {
    setSelectedMood(mood);
    setSessionStarted(true);
    const initialSeverity = 100 - mood.score;
    setSeverityScore(initialSeverity);
    setDistressLevel(initialSeverity >= 70 ? 'high' : initialSeverity >= 40 ? 'moderate' : 'low');

    const greeting: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `Hello! I'm glad you're here to talk. It sounds like you're feeling ${mood.label.toLowerCase()} right now. Would you like to tell me more about what's on your mind?`,
      created_at: new Date().toISOString()
    };
    setMessages([greeting]);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const detectedDistress = evaluateDistressLevel(trimmed);
    if (detectedDistress === 'high' || distressLevel !== 'high') {
      setDistressLevel(prev => {
        if (detectedDistress === 'high') return 'high';
        if (prev === 'high') return 'high';
        if (detectedDistress === 'moderate') return 'moderate';
        return prev;
      });
    }

    if (checkCrisisKeywords(trimmed)) {
      localStorage.setItem('catharsis_crisis_detected', trimmed);

      const crisisResponse: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: "I'm deeply concerned about what you've shared. Please reach out right now:\n\n- 988 Suicide & Crisis Lifeline - Call or text 988 (available 24/7)\n- Crisis Text Line - Text HOME to 741741\n\nIf you're in immediate danger, call 911. You don't have to face this alone.",
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, crisisResponse]);
      setIsTyping(false);
      setSeverityScore(prev => Math.min(100, prev + 40));
      setDistressLevel('high');
      setShowReferralBanner(true);
      return;
    }

    try {
      const firstUserIndex = messages.findIndex(m => m.role === 'user');
      const historyMessages = firstUserIndex === -1 ? [] : messages.slice(firstUserIndex);

      const chatHistory = historyMessages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }],
      }));

      const chat = genAI.chats.create({
        model: 'gemini-3.1-flash-lite',
        config: { systemInstruction: GEMINI_SYSTEM_PROMPT },
        history: chatHistory,
      });

      const result = await chat.sendMessage({ message: trimmed });
      const responseText = result.text ?? '';

      const newSeverity = Math.min(100, severityScore + calculateLocalSeverityIncrease(trimmed));
      setSeverityScore(newSeverity);

      if (detectedDistress === 'high' || newSeverity >= 70) {
        setDistressLevel('high');
      } else if (newSeverity >= 40 && distressLevel !== 'high') {
        setDistressLevel('moderate');
      }

      if (newSeverity >= 70 && !showReferralBanner) {
        setShowReferralBanner(true);
      }

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: responseText || "I'm here for you. Could you tell me more?",
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    } catch (error) {
      console.error('Gemini API error:', error);
      const fallback = getFallbackResponse(trimmed);
      setMessages(prev => [...prev, { id: `msg-${Date.now()}`, role: 'assistant', content: fallback, created_at: new Date().toISOString() }]);
      setIsTyping(false);
    }
  };

  const endSession = () => {
    const severityLevel: 'low' | 'moderate' | 'high' = severityScore >= 70 ? 'high' : severityScore >= 40 ? 'moderate' : 'low';

    const session: ConversationSession = {
      id: `session-${Date.now()}`,
      user_id: userId,
      messages,
      initial_mood: selectedMood?.label || 'Neutral',
      mood_score: selectedMood?.score || 50,
      severity_score: severityScore,
      severity_level: severityLevel,
      referral_suggested: showReferralBanner,
      referral_accepted: false,
      created_at: messages[0]?.created_at || new Date().toISOString(),
      ended_at: new Date().toISOString()
    };

    saveConversation(session);
    setMessages([]);
    setSessionStarted(false);
    setSelectedMood(null);
    setSeverityScore(0);
    setShowReferralBanner(false);
    setDistressLevel('low');
  };

  const acceptReferral = () => {
    const lastSession = messages.length > 0 ? {
      id: `session-${Date.now()}`,
      user_id: userId,
      messages,
      initial_mood: selectedMood?.label || 'Neutral',
      mood_score: selectedMood?.score || 50,
      severity_score: severityScore,
      severity_level: severityScore >= 70 ? 'high' : severityScore >= 40 ? 'moderate' : 'low' as const,
      referral_suggested: true,
      referral_accepted: true,
      created_at: messages[0]?.created_at || new Date().toISOString(),
      ended_at: new Date().toISOString()
    } : null;

    if (lastSession) saveConversation(lastSession);
    setActiveTab('psychologist');
  };

  if (!sessionStarted) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white rounded-3xl p-8 shadow-neumorphic text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
            <MessageCircle className="w-12 h-12 text-accent" />
          </div>
          <h1 className="font-lora text-3xl font-semibold text-primary mb-2">Start a Conversation</h1>
          <p className="font-nunito text-muted mb-8">How are you feeling right now, {profile?.name || 'there'}?</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {MOODS.map((mood) => (
              <button key={mood.label} onClick={() => startSession(mood)} className={`p-4 rounded-2xl border-2 transition-all hover:scale-105 ${mood.color} ${mood.borderColor} hover:shadow-lg`}>
                <div className="text-4xl mb-2">{mood.emoji}</div>
                <div className={`font-nunito text-sm font-semibold ${mood.textColor}`}>{mood.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-neumorphic overflow-hidden flex flex-col min-h-[calc(100vh-280px)]">
        <div className={`px-8 py-6 border-b ${severityScore >= 70 ? 'bg-red-50 border-red-200' : severityScore >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-sage-50 border-sage-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl">{selectedMood?.emoji}</div>
              <div>
                <h1 className="font-lora text-xl font-semibold text-primary">Conversation</h1>
                <p className="font-nunito text-sm text-muted">Started at {formatTime(messages[0]?.created_at || new Date().toISOString())}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-nunito text-xs text-muted">Severity Level</p>
                <p className={`font-lora text-lg font-semibold ${severityScore >= 70 ? 'text-coral' : severityScore >= 40 ? 'text-amber-600' : 'text-teal'}`}>{severityScore}%</p>
              </div>
              <div className="w-32 h-3 bg-sage-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${severityScore >= 70 ? 'bg-coral' : severityScore >= 40 ? 'bg-amber-400' : 'bg-teal'}`} style={{ width: `${severityScore}%` }} />
              </div>
              <button onClick={endSession} className="px-4 py-2 rounded-xl bg-sage-100 text-primary font-nunito font-medium hover:bg-sage-200 transition-colors">
                End Session
              </button>
            </div>
          </div>
        </div>

        {showReferralBanner && (
          <div className="px-8 py-4 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <p className="font-nunito text-amber-800">It seems like you're going through a difficult time. Would you like to speak with a therapist?</p>
              </div>
              <button onClick={acceptReferral} className="px-4 py-2 rounded-xl bg-accent text-white font-nunito font-semibold hover:bg-accent/90 transition-colors">
                Find Therapist
              </button>
            </div>
          </div>
        )}

        {distressLevel === 'high' && (
          <div className="px-8 py-5 bg-gradient-to-r from-[#E07A5F]/10 to-[#E07A5F]/5 border-b border-[#E07A5F]/30">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E07A5F]/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[#C4553D]" />
                </div>
                <p className="font-nunito text-[#6B3A2E] font-medium">
                  Our system detects you are carrying a deep emotional load today. Consider utilizing our note-sharing protocol to share your journal logs securely with a specialized counselor.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('psychologist')}
                className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-[#E07A5F] text-white font-nunito font-semibold hover:bg-[#C4553D] transition-colors shadow-sm"
              >
                View Specialists
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-6 py-4 ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-sage-50 text-primary shadow-neumorphic'}`}>
                <p className="font-nunito leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-sage-50 rounded-2xl px-6 py-4 shadow-neumorphic">
                <div className="flex gap-2">
                  <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-8 py-6 border-t border-sage-100 bg-white">
          <div className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-sage-50 rounded-xl px-6 py-4 font-nunito placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 text-lg"
            />
            <button onClick={sendMessage} disabled={!input.trim() || isTyping} className={`px-8 py-4 rounded-xl flex items-center gap-3 transition-all ${input.trim() && !isTyping ? 'bg-accent text-white hover:bg-accent/90' : 'bg-sage-100 text-muted'}`}>
              <Send className="w-5 h-5" />
              <span className="font-nunito font-medium hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="font-nunito text-xs text-muted text-center mt-4">This is an academic showcase. Not a substitute for professional mental health support.</p>
        </div>
      </div>
    </div>
  );
}

const HIGH_SEVERITY_WORDS = ['depressed', 'anxious', 'panic', 'overwhelmed', 'hopeless', 'worthless', 'trapped', 'terrified', 'scared', 'nightmare', 'trauma', 'abuse', 'alone', 'abandoned', 'reject'];
const MODERATE_SEVERITY_WORDS = ['stressed', 'worried', 'sad', 'tired', 'exhausted', 'frustrated', 'angry', 'confused', 'lost', 'struggling', 'difficult', 'hard time', 'not okay', 'not good'];
const POSITIVE_WORDS_LOWER = ['happy', 'grateful', 'good', 'great', 'wonderful', 'excited', 'calm', 'peaceful', 'joyful', 'love', 'hope', 'better', 'improving', 'glad', 'relieved'];

function calculateLocalSeverityIncrease(message: string): number {
  const lower = message.toLowerCase();
  let increase = 0;

  if (CRISIS_KEYWORDS.some(k => lower.includes(k))) increase += 13;
  if (HIGH_SEVERITY_WORDS.some(w => lower.includes(w))) increase += 5;
  if (MODERATE_SEVERITY_WORDS.some(w => lower.includes(w))) increase += 3;
  if (POSITIVE_WORDS_LOWER.some(w => lower.includes(w))) increase -= 2;

  return Math.max(0, increase);
}

function getFallbackResponse(input: string): string {
  if (checkCrisisKeywords(input)) {
    return "I'm concerned about what you've shared. Please reach out to 988 or go to your nearest emergency room. You're not alone.";
  }
  const lower = input.toLowerCase();
  if (['good', 'great', 'happy', 'wonderful'].some(w => lower.includes(w))) {
    return "That's wonderful to hear! What's been bringing you joy lately?";
  }
  if (['sad', 'anxious', 'worried', 'stressed'].some(w => lower.includes(w))) {
    return "I hear you. Your feelings are valid. Would you like to talk more about what's bothering you?";
  }
  return "Thank you for sharing. I'm here to listen. What else is on your mind?";
}

function JournalScreen({ conversations, onSelectSession }: { conversations: ConversationSession[]; onSelectSession: (s: ConversationSession) => void }) {
  const sorted = [...conversations].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const groupByDate = (sessions: ConversationSession[]) => {
    const groups: Record<string, ConversationSession[]> = {};
    sessions.forEach(s => {
      const date = new Date(s.created_at).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(s);
    });
    return groups;
  };

  const grouped = groupByDate(sorted);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="font-lora text-3xl font-semibold text-primary">Conversation Journal</h1>
        <p className="font-nunito text-muted mt-1">{conversations.length} {conversations.length === 1 ? 'session' : 'sessions'} recorded</p>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 shadow-neumorphic text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-sage-100 flex items-center justify-center">
            <BookHeart className="w-12 h-12 text-accent" />
          </div>
          <h3 className="font-lora text-2xl font-semibold text-primary mb-3">No conversations yet</h3>
          <p className="font-nunito text-muted text-lg">Start a chat to see your session history here.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dateSessions]) => (
          <div key={date} className="space-y-4">
            <h3 className="font-lora text-lg font-semibold text-muted pl-2">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dateSessions.map(session => {
                const moodConfig = MOODS.find(m => m.label === session.initial_mood) || MOODS[2];
                return (
                  <button key={session.id} onClick={() => onSelectSession(session)} className="bg-white rounded-2xl p-6 shadow-neumorphic text-left hover:shadow-neumorphic-lg transition-all">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${moodConfig.color} flex items-center justify-center text-3xl`}>{moodConfig.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-lora text-lg font-semibold text-primary">{session.initial_mood}</span>
                          <span className="font-nunito text-sm text-muted">{formatTime(session.created_at)}</span>
                        </div>
                        <p className="font-nunito text-muted text-sm mb-3">{session.messages.length} messages exchanged</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-nunito font-medium ${session.severity_level === 'high' ? 'bg-red-50 text-coral' : session.severity_level === 'moderate' ? 'bg-amber-50 text-amber-600' : 'bg-sage-50 text-teal'}`}>
                            {session.severity_level} severity ({session.severity_score}%)
                          </span>
                          {session.referral_suggested && (
                            <span className="px-3 py-1 rounded-full text-xs font-nunito font-medium bg-amber-100 text-amber-700">
                              Therapist suggested
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SessionDetailModal({ session, onClose }: { session: ConversationSession; onClose: () => void }) {
  const moodConfig = MOODS.find(m => m.label === session.initial_mood) || MOODS[2];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-neumorphic-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-sage-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${moodConfig.color} flex items-center justify-center text-3xl`}>{moodConfig.emoji}</div>
              <div>
                <h2 className="font-lora text-xl font-semibold text-primary">{session.initial_mood}</h2>
                <p className="font-nunito text-sm text-muted">{new Date(session.created_at).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-sage-50 hover:bg-sage-100 flex items-center justify-center"><X className="w-5 h-5 text-muted" /></button>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <span className={`px-3 py-1 rounded-full text-xs font-nunito font-medium ${session.severity_level === 'high' ? 'bg-red-50 text-coral' : session.severity_level === 'moderate' ? 'bg-amber-50 text-amber-600' : 'bg-sage-50 text-teal'}`}>{session.severity_level} severity</span>
            <span className="px-3 py-1 rounded-full text-xs font-nunito font-medium bg-sage-50 text-muted">{session.messages.length} messages</span>
            {session.referral_suggested && <span className="px-3 py-1 rounded-full text-xs font-nunito font-medium bg-amber-100 text-amber-700">Therapist suggested</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {session.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-sage-50 text-primary'}`}>
                <p className="font-nunito text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-sage-100">
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-sage-50 text-primary font-nunito font-semibold hover:bg-sage-100 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

function PsychologistScreen({ userId, therapists, appointments, saveAppointment }: { userId: string; therapists: Therapist[]; appointments: Appointment[]; saveAppointment: (a: Omit<Appointment, 'id' | 'created_at'>) => void }) {
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [shareJournal, setShareJournal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const timeSlots = [];
  const now = new Date(); now.setDate(now.getDate() + 1);
  for (let i = 0; i < 7; i++) {
    const date = new Date(now); date.setDate(date.getDate() + i);
    for (let hour = 9; hour <= 17; hour += 2) {
      const slot = new Date(date); slot.setHours(hour, 0, 0, 0);
      timeSlots.push(slot);
    }
  }

  const handleBooking = () => {
    if (!selectedTherapist || !selectedSlot) return;
    saveAppointment({ user_id: userId, therapist_id: selectedTherapist.id, therapist: selectedTherapist, scheduled_at: selectedSlot.toISOString(), status: 'pending', share_journal: shareJournal });
    setShowConfirmation(false); setSelectedTherapist(null); setSelectedSlot(null); setShareJournal(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="font-lora text-3xl font-semibold text-primary">Find a Therapist</h1>
        <p className="font-nunito text-muted mt-1">Connect with licensed mental health professionals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {therapists.map(t => (
          <div key={t.id} className="bg-white rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-lg transition-all">
            <div className="flex items-start gap-4 mb-4">
              <img src={t.avatar_url} alt={t.name} className="w-20 h-20 rounded-2xl object-cover shadow-md" />
              <div className="flex-1">
                <h3 className="font-lora text-xl font-semibold text-primary">{t.name}</h3>
                <p className="font-nunito text-muted">{t.specialty}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /><span className="font-nunito text-sm font-semibold text-primary">{t.rating}</span></div>
                  <span className="text-sage-200">|</span>
                  <span className="font-nunito text-sm text-muted">{t.experience_years} years exp</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-lora text-2xl font-semibold text-accent">${t.hourly_rate}</p>
                <p className="font-nunito text-xs text-muted">/hour</p>
              </div>
            </div>
            <p className="font-nunito text-muted text-sm mb-4">{t.bio}</p>
            <button onClick={() => setSelectedTherapist(t)} className="w-full py-3 rounded-xl bg-accent text-white font-nunito font-semibold hover:bg-accent/90 transition-colors">Book Session</button>
          </div>
        ))}
      </div>

      {selectedTherapist && !showConfirmation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-neumorphic-lg max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-lora text-2xl font-semibold text-primary">Book with {selectedTherapist.name}</h2>
                <p className="font-nunito text-muted">{selectedTherapist.specialty}</p>
              </div>
              <button onClick={() => { setSelectedTherapist(null); setSelectedSlot(null); }} className="w-10 h-10 rounded-full bg-sage-50 hover:bg-sage-100 flex items-center justify-center"><X className="w-5 h-5 text-muted" /></button>
            </div>
            <h3 className="font-lora text-lg font-semibold text-primary mb-4">Select a Time Slot</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              {timeSlots.slice(0, 16).map(slot => {
                const isSelected = selectedSlot?.getTime() === slot.getTime();
                return (
                  <button key={slot.toISOString()} onClick={() => setSelectedSlot(slot)} className={`p-3 rounded-xl transition-all ${isSelected ? 'bg-accent text-white shadow-md' : 'bg-sage-50 text-primary hover:bg-sage-100'}`}>
                    <div className="font-nunito font-semibold text-sm">{slot.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div className="font-nunito text-xs mt-1">{slot.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowConfirmation(true)} disabled={!selectedSlot} className={`w-full py-4 rounded-xl font-nunito font-semibold transition-all ${selectedSlot ? 'bg-accent text-white hover:bg-accent/90' : 'bg-sage-100 text-muted cursor-not-allowed'}`}>Continue to Confirm</button>
          </div>
        </div>
      )}

      {showConfirmation && selectedTherapist && selectedSlot && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-neumorphic-lg p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center"><Sparkles className="w-10 h-10 text-accent" /></div>
              <h2 className="font-lora text-2xl font-semibold text-primary">Confirm Booking</h2>
              <div className="mt-4 bg-sage-50 rounded-xl p-4">
                <p className="font-nunito font-semibold text-primary">{selectedTherapist.name}</p>
                <p className="font-nunito text-sm text-muted">{selectedTherapist.specialty}</p>
                <p className="font-nunito text-sm text-primary mt-2">{selectedSlot.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            <div className="bg-sage-50 rounded-xl p-5 mb-6">
              <label className="flex items-start gap-4 cursor-pointer">
                <input type="checkbox" checked={shareJournal} onChange={(e) => setShareJournal(e.target.checked)} className="w-5 h-5 rounded border-sage-300 text-accent focus:ring-accent/20 mt-1" />
                <div>
                  <p className="font-nunito font-semibold text-primary">Share my conversation journal</p>
                  <p className="font-nunito text-sm text-muted mt-1">Allow this therapist to view your recent conversation sessions to better understand your needs.</p>
                </div>
              </label>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowConfirmation(false)} className="flex-1 py-4 rounded-xl bg-sage-50 text-primary font-nunito font-semibold hover:bg-sage-100 transition-colors">Back</button>
              <button onClick={handleBooking} className="flex-1 py-4 rounded-xl bg-accent text-white font-nunito font-semibold hover:bg-accent/90 transition-colors">Confirm Booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightsScreen({ conversations }: { conversations: ConversationSession[] }) {
  const severityData = [
    { level: 'High', count: conversations.filter(c => c.severity_level === 'high').length, fill: '#FF6B6B' },
    { level: 'Moderate', count: conversations.filter(c => c.severity_level === 'moderate').length, fill: '#FCD34D' },
    { level: 'Low', count: conversations.filter(c => c.severity_level === 'low').length, fill: '#4ECDC4' },
  ];

  const trendData = conversations.slice(0, 14).reverse().map(c => ({
    date: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    severity: c.severity_score,
    wellbeing: 100 - c.severity_score
  }));

  const avgSeverity = conversations.length > 0 ? conversations.reduce((sum, c) => sum + c.severity_score, 0) / conversations.length : 0;
  const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="font-lora text-3xl font-semibold text-primary">Your Insights</h1>
        <p className="font-nunito text-muted mt-1">Understanding your mental wellness patterns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-neumorphic">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center"><Activity className="w-6 h-6 text-teal" /></div>
            <span className="font-nunito text-muted">Avg Wellbeing</span>
          </div>
          <p className="font-lora text-4xl font-bold text-primary">{Math.round(100 - avgSeverity)}%</p>
          <p className="font-nunito text-sm text-muted">score</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-neumorphic">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center"><MessageCircle className="w-6 h-6 text-accent" /></div>
            <span className="font-nunito text-muted">Total Sessions</span>
          </div>
          <p className="font-lora text-4xl font-bold text-primary">{conversations.length}</p>
          <p className="font-nunito text-sm text-muted">recorded</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-neumorphic">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center"><span className="text-2xl">💬</span></div>
            <span className="font-nunito text-muted">Messages</span>
          </div>
          <p className="font-lora text-4xl font-bold text-primary">{totalMessages}</p>
          <p className="font-nunito text-sm text-muted">exchanged</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-neumorphic">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-coral" /></div>
            <span className="font-nunito text-muted">Referrals</span>
          </div>
          <p className="font-lora text-4xl font-bold text-primary">{conversations.filter(c => c.referral_suggested).length}</p>
          <p className="font-nunito text-sm text-muted">suggested</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-neumorphic">
          <h3 className="font-lora text-xl font-semibold text-primary mb-6">Severity Trend</h3>
          {trendData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8F0EA" />
                  <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(45, 106, 79, 0.1)' }} />
                  <Line type="monotone" dataKey="severity" stroke="#FF6B6B" strokeWidth={2} dot={{ fill: '#FF6B6B', r: 4 }} />
                  <Line type="monotone" dataKey="wellbeing" stroke="#4ECDC4" strokeWidth={2} dot={{ fill: '#4ECDC4', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-muted"><p className="font-nunito">No conversations yet</p></div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-neumorphic">
          <h3 className="font-lora text-xl font-semibold text-primary mb-6">Severity Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData.filter(d => d.count > 0)}><CartesianGrid strokeDasharray="3 3" stroke="#E8F0EA" /><XAxis dataKey="level" tick={{ fill: '#1A2E26', fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(45, 106, 79, 0.1)' }} /><Bar dataKey="count" radius={[6, 6, 0, 0]}>{severityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-coral/10 border border-coral/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-coral flex-shrink-0" />
          <div>
            <h4 className="font-lora font-semibold text-primary mb-2">Important Notice</h4>
            <p className="font-nunito text-sm text-muted leading-relaxed">This is an academic engineering showcase. It does not replace professional medical diagnosis or psychiatric healthcare. If you're experiencing a mental health crisis, please contact 988.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
