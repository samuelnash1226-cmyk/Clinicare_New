import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { LogOut, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsPageProps {
  userEmail: string;
  userRole: string;
}

export function SettingsPage({ userEmail, userRole }: SettingsPageProps) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-slate-900">Settings</h1>
        <p className="mt-2 text-slate-600">
          Manage your account settings
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-slate-200 bg-white shadow-sm hover-lift">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-slate-900">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-ndkc-green to-emerald-600 shadow-lg shadow-emerald-500/30">
              <User className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">{userEmail}</p>
              <div className="mt-1 flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-500" />
                <p className="text-sm text-slate-600 capitalize">
                  {userRole} Account
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="border-slate-200 bg-white shadow-sm hover-lift">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-slate-900">Account Actions</CardTitle>
          <p className="mt-1 text-sm text-slate-600">Manage your account security</p>
        </CardHeader>
        <CardContent className="pt-6">
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="h-12 w-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
