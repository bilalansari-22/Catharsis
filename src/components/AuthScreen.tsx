import { useState } from 'react';
import { Leaf, Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        onAuthSuccess(data.user);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please check your email to confirm your account.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            name: `${firstName} ${lastName}`.trim(),
            bio: '',
            avatar_url: '',
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        setMessage('Account created successfully! You are now logged in.');

        setTimeout(() => {
          onAuthSuccess(data.user);
        }, 500);
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      if (err.message?.includes('already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-neumorphic-lg p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center shadow-neumorphic">
              <Leaf className="w-10 h-10 text-accent" />
            </div>
            <h1 className="font-lora text-3xl font-semibold text-primary mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="font-nunito text-muted">
              {isSignUp
                ? 'Start your mental wellness journey'
                : 'Sign in to continue your journey'}
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="font-nunito text-red-700 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 bg-teal/10 border border-teal/20 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <Leaf className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
              <p className="font-nunito text-teal text-sm">{message}</p>
            </div>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-5">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-nunito text-sm font-semibold text-primary mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-sage-50 rounded-xl pl-12 pr-4 py-3.5 font-nunito text-primary placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                      placeholder="First"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-nunito text-sm font-semibold text-primary mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-sage-50 rounded-xl px-4 py-3.5 font-nunito text-primary placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                    placeholder="Last"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-nunito text-sm font-semibold text-primary mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-sage-50 rounded-xl pl-12 pr-4 py-3.5 font-nunito text-primary placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-nunito text-sm font-semibold text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-sage-50 rounded-xl pl-12 pr-12 py-3.5 font-nunito text-primary placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder={isSignUp ? 'At least 6 characters' : 'Enter password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block font-nunito text-sm font-semibold text-primary mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-sage-50 rounded-xl pl-12 pr-4 py-3.5 font-nunito text-primary placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-nunito font-semibold transition-all ${
                isLoading
                  ? 'bg-sage-100 text-muted cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent/90 shadow-md hover:shadow-lg'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-sage-100">
            <p className="text-center font-nunito text-muted">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setMessage('');
                }}
                className="text-accent font-semibold hover:underline transition-all"
              >
                {isSignUp ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </div>

          <div className="mt-6 bg-sage-50 rounded-xl p-4 text-center">
            <p className="font-nunito text-xs text-muted leading-relaxed">
              By continuing, you acknowledge this is an academic showcase and not a substitute for professional medical care.
              If you're in crisis, please contact 988.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
