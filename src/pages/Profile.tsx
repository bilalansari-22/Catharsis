import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Upload, Save, X, LogOut, Leaf, BookHeart, Calendar, Clock } from 'lucide-react';

interface ProfileData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  bio: string;
  avatar_url: string;
  name: string;
}

interface AppointmentData {
  id: string;
  therapist_id: string;
  scheduled_at: string;
  status: string;
  share_journal: boolean;
  therapist?: { name: string; specialty: string };
}

interface Props {
  onBack: () => void;
  userId: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export function Profile({ onBack, userId }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [journalCount, setJournalCount] = useState(0);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
        });
      } else {
        const storedProfile = localStorage.getItem('catharsis_profile');
        const localProfile = storedProfile ? JSON.parse(storedProfile) : null;
        const nameParts = localProfile?.name?.split(' ') || ['Ahmad', ''];

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            first_name: nameParts[0] || 'Ahmad',
            last_name: nameParts.slice(1).join(' ') || '',
            name: localProfile?.name || 'Ahmad',
            bio: '',
            avatar_url: '',
          })
          .select()
          .single();

        if (createError) throw createError;

        if (newProfile) {
          setProfile(newProfile);
          setFormData({
            first_name: newProfile.first_name || '',
            last_name: newProfile.last_name || '',
            bio: newProfile.bio || '',
            avatar_url: newProfile.avatar_url || '',
          });
        }
      }

      const { count, error: journalError } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!journalError && count !== null) {
        setJournalCount(count);
      }

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, therapist_id, scheduled_at, status, share_journal, therapists(name, specialty)')
        .eq('user_id', userId)
        .order('scheduled_at', { ascending: true });

      if (!appointmentsError && appointmentsData) {
        setAppointments(appointmentsData as unknown as AppointmentData[]);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveProfile() {
    try {
      setIsSaving(true);
      setError('');

      if (!profile) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          name: `${formData.first_name} ${formData.last_name}`.trim(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        ...formData,
        name: `${formData.first_name} ${formData.last_name}`.trim(),
      });

      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          avatar_url: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <p className="text-slate-600">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header Background */}
          <div className="h-32 bg-gradient-to-r from-primary/20 to-accent/20"></div>

          {/* Profile Content */}
          <div className="px-6 pb-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center -mt-16 mb-6">
              <div className="relative mb-4">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="Profile"
                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover bg-slate-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-4xl font-bold text-primary">
                    {formData.first_name.charAt(0)}{formData.last_name.charAt(0)}
                  </div>
                )}
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary/90 transition shadow-lg">
                    <Upload className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Profile Information */}
            <div className="space-y-6">
              {!isEditing ? (
                // View Mode
                <>
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900">
                      {formData.first_name} {formData.last_name}
                    </h1>
                  </div>

                  {formData.bio && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Bio</p>
                      <p className="text-slate-600">{formData.bio}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition"
                  >
                    Edit Profile
                  </button>

                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                    }}
                    className="w-full bg-red-50 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2 border border-red-200"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </>
              ) : (
                // Edit Mode
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) =>
                          setFormData({ ...formData, first_name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) =>
                          setFormData({ ...formData, last_name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData({ ...formData, bio: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      rows={4}
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          first_name: profile.first_name || '',
                          last_name: profile.last_name || '',
                          bio: profile.bio || '',
                          avatar_url: profile.avatar_url || '',
                        });
                      }}
                      className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-300 transition flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <BookHeart className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Journal Entries</p>
                <p className="text-2xl font-bold text-slate-900">{journalCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Scheduled Appointments</p>
                <p className="text-2xl font-bold text-slate-900">{appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        {appointments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 mt-4">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Upcoming Appointments</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').map(apt => (
                <div key={apt.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{apt.therapist?.name || 'Therapist'}</p>
                      <p className="text-sm text-slate-500">{apt.therapist?.specialty || 'Counseling'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {new Date(apt.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(apt.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length === 0 && (
                <div className="px-5 py-6 text-center text-slate-400 text-sm">No upcoming appointments</div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={async () => {
            await supabase.auth.signOut();
          }}
          className="w-full bg-red-50 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2 border border-red-200"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Leaf className="w-4 h-4" />
            <p className="text-xs">Catharsis - Your Mental Wellness Companion</p>
          </div>
        </div>
      </div>
    </div>
  );
}
