import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, Loader2, Heart, Shield, Activity, Settings, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import srbLogo from "../../assets/4a75b62a01df7e8cfb0ca5e95cb4075dd831b41b.png";
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
    <div className="min-h-screen bg-white flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-emerald-50/40 to-transparent rounded-full blur-3xl"></div>
        
        <div className="w-full max-w-md relative z-10 animate-fadeIn">
          {/* Logo */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 mb-6">
              <img src={srbLogo} alt="SRB Logo" className="h-12 w-12 object-contain drop-shadow-lg" />
              <h1 className="text-2xl font-bold text-slate-900">NDKC ClinicCare</h1>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-600">Please enter your details</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@ndkc.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border-slate-200 bg-white transition-all focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 border-slate-200 bg-white transition-all focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full bg-ndkc-green hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                </>
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
                <span className="bg-white px-4 text-slate-500">New to the system?</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onFirstTimeSetup}
              className="h-12 w-full mt-4 border-2 border-slate-200 bg-white hover:bg-slate-50 transition-all group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-ndkc-green" />
                <span className="font-medium text-slate-700">
                  First Time Setup
                </span>
              </div>
            </Button>
          </div>

          {/* Features List */}
          <div className="mt-12 space-y-3">
            {[
              { icon: CheckCircle2, text: 'Real-time health monitoring' },
              { icon: Shield, text: 'Secure & encrypted data' },
              { icon: Activity, text: 'Automated parent notifications' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm text-slate-600">
                <feature.icon className="h-4 w-4 text-ndkc-green" />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center mb-3">Developed by:</p>
            <div className="space-y-1 text-center">
              <p className="text-xs text-slate-600 font-medium">Samuel Nash F. Sanchez</p>
              <p className="text-xs text-slate-600 font-medium">Bradleymar Howard D. Dulay</p>
              <p className="text-xs text-slate-600 font-medium">Edrian G. Jariolne</p>
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">
              © 2026 Notre Dame of Kidapawan College
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Campus Image (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100">
        <img
          src={campusImage}
          alt="Notre Dame of Kidapawan College Campus"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-ndkc-green/20 via-transparent to-emerald-900/30"></div>
        
        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="max-w-lg space-y-6 animate-fadeIn">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">
              <Heart className="h-4 w-4" />
              <span className="text-sm font-medium">School Health Management</span>
            </div>
            
            <h2 className="text-4xl font-bold leading-tight drop-shadow-lg">
              Modern Healthcare for Notre Dame Students
            </h2>
            
            <p className="text-lg text-white/90 leading-relaxed drop-shadow">
              NDKC ClinicCare provides comprehensive health monitoring, real-time notifications, 
              and secure medical records for the NDKC community.
            </p>

            <div className="flex items-center gap-6 pt-4">
              <div>
                <p className="text-3xl font-bold">100+</p>
                <p className="text-sm text-white/80">Students Served</p>
              </div>
              <div className="h-12 w-px bg-white/30"></div>
              <div>
                <p className="text-3xl font-bold">24/7</p>
                <p className="text-sm text-white/80">Health Monitoring</p>
              </div>
              <div className="h-12 w-px bg-white/30"></div>
              <div>
                <p className="text-3xl font-bold">100%</p>
                <p className="text-sm text-white/80">Secure Data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}