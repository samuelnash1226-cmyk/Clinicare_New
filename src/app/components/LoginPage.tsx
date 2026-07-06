import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, Loader2, Heart, Shield, Activity, Settings, Sparkles, CheckCircle2, Mail, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import srbLogo from "/assets/4a75b62a01df7e8cfb0ca5e95cb4075dd831b41b.png";
import campusImage from '../imports/image-1.png';

interface LoginPageProps {
  onLogin: () => void;
  onFirstTimeSetup: () => void;
}

export function LoginPage({ onLogin, onFirstTimeSetup }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      onLogin();
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 relative overflow-hidden">
        {/* Ambient background glow decoration */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-gradient-to-br from-emerald-100/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-gradient-to-tl from-teal-100/20 to-transparent rounded-full blur-3xl"></div>

        <div className="w-full max-w-md relative z-10 animate-fadeIn">
          {/* Logo Section */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-5 group">
              {/* Soft pulsing glow behind logo */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-ndkc-green to-emerald-400 opacity-20 blur-xl group-hover:opacity-45 group-hover:scale-110 transition-all duration-500"></div>

              {/* Premium Logo Ring Container */}
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white p-4 shadow-xl border border-slate-100/80 transition-all duration-500 group-hover:scale-105 hover:border-emerald-200">
                <img src={srbLogo} alt="SRB Logo" className="h-20 w-20 object-contain drop-shadow-md" />
              </div>
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-emerald-800 to-slate-900 bg-clip-text text-transparent tracking-tight">
              NDKC ClinicCare
            </h1>
            <p className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/60 uppercase tracking-wider">
              School Health Management
            </p>
            <h2 className="text-xl font-bold text-slate-800 mt-6">Welcome Back</h2>
            <p className="text-sm text-slate-500 mt-1">Please enter your login credentials</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold flex items-center gap-2 text-xs uppercase tracking-wider">
                <Mail className="h-4 w-4 text-emerald-600" /> Email address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@ndkc.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 border-slate-200 bg-white transition-all duration-200 focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20 text-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-semibold flex items-center gap-2 text-xs uppercase tracking-wider">
                <Lock className="h-4 w-4 text-emerald-600" /> Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 border-slate-200 bg-white transition-all duration-200 focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20 text-slate-800 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full bg-gradient-to-r from-ndkc-green to-emerald-600 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 rounded-xl"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-semibold">Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <LogIn className="h-5 w-5" />
                  <span className="font-semibold">Sign In</span>
                </div>
              )}
            </Button>
          </form>

          {/* First Time Setup */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-slate-50 px-4 text-slate-500 font-medium">New to the system?</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onFirstTimeSetup}
              className="h-12 w-full mt-4 border border-slate-200 bg-white hover:bg-slate-50/50 hover:border-emerald-200 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group shadow-sm rounded-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-ndkc-green group-hover:animate-pulse" />
                <span className="font-semibold text-slate-700 group-hover:text-slate-900">
                  First Time Setup
                </span>
              </div>
            </Button>
          </div>

          {/* Features List */}
          <div className="mt-10 grid grid-cols-3 gap-2">
            {[
              { icon: CheckCircle2, text: 'Real-time monitoring' },
              { icon: Shield, text: 'Secure records' },
              { icon: Activity, text: 'Auto alert system' },
            ].map((feature, idx) => (
              <div key={idx} className="flex flex-col items-center p-3 bg-white border border-slate-100 shadow-sm rounded-xl text-center">
                <feature.icon className="h-5 w-5 text-ndkc-green mb-1.5" />
                <span className="text-[10px] font-semibold text-slate-600 leading-tight">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-col items-center">
            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-3">System Developers</p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 w-full text-center">
              <span className="text-[10px] text-slate-500 font-semibold hover:text-emerald-700 transition-colors">Samuel Nash Sanchez</span>
              <span className="text-[10px] text-slate-500 font-semibold hover:text-emerald-700 transition-colors">Bradleymar Howard Dulay</span>
              <span className="text-[10px] text-slate-500 font-semibold hover:text-emerald-700 transition-colors">Edrian Jariolne</span>
            </div>
            <p className="mt-6 text-center text-[10px] text-slate-400/80 font-medium">
              © 2026 Notre Dame of Kidapawan College
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Campus Image (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img
          src={campusImage}
          alt="Notre Dame of Kidapawan College Campus"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10000ms] hover:scale-105"
        />

        {/* Overlay with rich gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-900/30 to-transparent"></div>

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-end p-12 text-white w-full h-full">
          <div className="max-w-lg space-y-6 animate-fadeIn">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <Heart className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="text-sm font-medium">School Health Management</span>
            </div>

            <h2 className="text-4xl font-bold leading-tight drop-shadow-lg">
              Modern Healthcare for Notre Dame Students
            </h2>

            <p className="text-lg text-white/90 leading-relaxed drop-shadow">
              NDKC ClinicCare provides comprehensive health monitoring, real-time notifications,
              and secure medical records for the NDKC community.
            </p>

            {/* Premium Stat cards with glassmorphism */}
            <div className="flex items-center gap-4 pt-4 w-full">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex-1 text-center hover:bg-white/15 transition-all duration-300">
                <p className="text-3xl font-extrabold tracking-tight">1000+</p>
                <p className="text-xs text-white/80 mt-1 font-medium">Students Served</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex-1 text-center hover:bg-white/15 transition-all duration-300">
                <p className="text-3xl font-extrabold tracking-tight">24/7</p>
                <p className="text-xs text-white/80 mt-1 font-medium">Real-time alerts</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex-1 text-center hover:bg-white/15 transition-all duration-300">
                <p className="text-3xl font-extrabold tracking-tight">100%</p>
                <p className="text-xs text-white/80 mt-1 font-medium">Secure Data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}