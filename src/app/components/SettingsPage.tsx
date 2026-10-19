import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  LogOut,
  User,
  Shield,
  Mail,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Key,
  Smartphone,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getEmailSettings,
  updateEmailSettings,
  getSMSSettings,
  updateSMSSettings,
  sendParentNotification,
  sendParentSMS,
  DEFAULT_EMAILJS_CONFIG,
  DEFAULT_FMCSMS_CONFIG,
} from '../lib/firestore-setup';

interface SettingsPageProps {
  userEmail: string;
  userRole: string;
}

export function SettingsPage({ userEmail, userRole }: SettingsPageProps) {
  // EmailJS configuration state
  const [emailServiceId, setEmailServiceId] = useState(DEFAULT_EMAILJS_CONFIG.serviceId);
  const [emailTemplateId, setEmailTemplateId] = useState(DEFAULT_EMAILJS_CONFIG.templateId);
  const [emailPublicKey, setEmailPublicKey] = useState(DEFAULT_EMAILJS_CONFIG.publicKey);
  const [savingEmail, setSavingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(userEmail || '');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // FMCSMS configuration state
  const [smsApiKey, setSmsApiKey] = useState(DEFAULT_FMCSMS_CONFIG.apiKey);
  const [smsSenderName, setSmsSenderName] = useState(DEFAULT_FMCSMS_CONFIG.senderName);
  const [savingSms, setSavingSms] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [sendingTestSms, setSendingTestSms] = useState(false);

  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    setLoadingSettings(true);
    try {
      const emailConfig = await getEmailSettings();
      if (emailConfig) {
        if (emailConfig.serviceId) setEmailServiceId(emailConfig.serviceId);
        if (emailConfig.templateId) setEmailTemplateId(emailConfig.templateId);
        if (emailConfig.publicKey) setEmailPublicKey(emailConfig.publicKey);
      }

      const smsConfig = await getSMSSettings();
      if (smsConfig) {
        if (smsConfig.apiKey) setSmsApiKey(smsConfig.apiKey);
        if (smsConfig.senderName) setSmsSenderName(smsConfig.senderName);
      }
    } catch (err) {
      console.warn('Could not load notification settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!emailServiceId || !emailTemplateId || !emailPublicKey) {
      toast.error('All EmailJS fields are required');
      return;
    }

    setSavingEmail(true);
    try {
      await updateEmailSettings(emailServiceId.trim(), emailTemplateId.trim(), emailPublicKey.trim());
      toast.success('EmailJS settings updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update EmailJS settings: ${error.message}`);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      toast.error('Please enter a valid recipient email address for testing');
      return;
    }

    setSendingTestEmail(true);
    try {
      await sendParentNotification({
        parentEmail: testEmailAddress.trim(),
        parentName: 'Test Parent / Staff',
        studentName: 'Sample Student',
        grade: 'Grade 10 - St. Ignatius',
        symptoms: 'Mild headache (System Diagnostic Test)',
        treatment: 'Rest for 15 minutes, hydration provided',
        pickupRequired: false,
        visitDate: new Date().toLocaleString(),
        nurseName: 'SRB ClinicCare Diagnostics',
        notes: 'This is an automatic diagnostic test message sent from Settings.',
      });
      toast.success(`✅ Test email delivered successfully to ${testEmailAddress}! Check your inbox.`);
    } catch (error: any) {
      console.error('Test email error:', error);
      toast.error(`❌ Test email failed: ${error.message || 'Unknown error'}`);
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleSaveSmsSettings = async () => {
    if (!smsApiKey || !smsSenderName) {
      toast.error('API Key and Sender Name are required');
      return;
    }

    setSavingSms(true);
    try {
      await updateSMSSettings(smsApiKey.trim(), smsSenderName.trim());
      toast.success('FMCSMS SMS settings updated successfully!');
    } catch (error: any) {
      toast.error(`Failed to update FMCSMS settings: ${error.message}`);
    } finally {
      setSavingSms(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!testPhoneNumber || testPhoneNumber.replace(/[^0-9]/g, '').length < 10) {
      toast.error('Please enter a valid 11-digit Philippine mobile number (e.g., 09516495356)');
      return;
    }

    setSendingTestSms(true);
    try {
      await sendParentSMS({
        parentPhone: testPhoneNumber.trim(),
        parentName: 'Parent',
        studentName: 'Sample Student',
        grade: 'Grade 10',
        symptoms: 'Test check',
        treatment: 'Checkup ok',
        pickupRequired: false,
        visitDate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        nurseName: 'ClinicCare',
      });
      toast.success(`✅ Test SMS queued and sent successfully to ${testPhoneNumber}!`);
    } catch (error: any) {
      console.error('Test SMS error:', error);
      toast.error(`❌ Test SMS failed: ${error.message || 'Unknown error'}`);
    } finally {
      setSendingTestSms(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your account profile and notification configurations
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-slate-200 bg-white shadow-sm hover-lift">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-slate-900">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ndkc-green to-emerald-600 shadow-lg shadow-emerald-500/30">
              <User className="h-8 w-8 text-white" />
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

      {/* Notification Configuration & Testing Section (Admin & Staff) */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Send className="h-5 w-5 text-ndkc-green" />
            Notifications & Messaging Services
          </h2>
          <p className="text-sm text-slate-600">
            Configure and test email and SMS delivery for parent notifications
          </p>
        </div>

        {/* EMAIL (EmailJS) CONFIGURATION */}
        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-slate-900">Email Notifications (EmailJS)</CardTitle>
                  <CardDescription className="text-xs">
                    Automated email alerts sent to parents when clinic visits are logged
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 w-fit">
                <Check className="h-3 w-3 mr-1" /> Active & Connected
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Service ID</Label>
                <Input
                  value={emailServiceId}
                  onChange={(e) => setEmailServiceId(e.target.value)}
                  placeholder="e.g. service_aip6vxq"
                  disabled={!isAdmin || loadingSettings}
                  className="font-mono text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Template ID</Label>
                <Input
                  value={emailTemplateId}
                  onChange={(e) => setEmailTemplateId(e.target.value)}
                  placeholder="e.g. template_sk6tt9j"
                  disabled={!isAdmin || loadingSettings}
                  className="font-mono text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Public Key (User ID)</Label>
                <Input
                  value={emailPublicKey}
                  onChange={(e) => setEmailPublicKey(e.target.value)}
                  placeholder="e.g. oS5baCpPMFDl1rgVA"
                  disabled={!isAdmin || loadingSettings}
                  className="font-mono text-sm bg-white"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveEmailSettings}
                  disabled={savingEmail}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                >
                  {savingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save EmailJS Settings
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Live Test Email Section */}
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-3">
              <p className="text-xs font-semibold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Live Email Diagnostic Test
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="Enter email to receive test message..."
                  className="bg-white border-purple-200 text-sm h-10"
                />
                <Button
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail || !testEmailAddress}
                  className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 h-10"
                >
                  {sendingTestEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Test...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMS (FMCSMS) CONFIGURATION */}
        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-slate-900">SMS Notifications (FMCSMS)</CardTitle>
                  <CardDescription className="text-xs">
                    Direct SMS messages delivered to parents' mobile phones (+63 format)
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 w-fit">
                <Check className="h-3 w-3 mr-1" /> Active & Connected
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">FMCSMS API Key</Label>
                <Input
                  value={smsApiKey}
                  onChange={(e) => setSmsApiKey(e.target.value)}
                  placeholder="e.g. fmcsms_c3a64b..."
                  disabled={!isAdmin || loadingSettings}
                  className="font-mono text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Sender Name</Label>
                <Input
                  value={smsSenderName}
                  onChange={(e) => setSmsSenderName(e.target.value)}
                  placeholder="e.g. NDKC ClinicCare"
                  disabled={!isAdmin || loadingSettings}
                  className="text-sm bg-white"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveSmsSettings}
                  disabled={savingSms}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  {savingSms ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save FMCSMS Settings
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Live Test SMS Section */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
              <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Live SMS Diagnostic Test
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="tel"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="Enter Philippine mobile number (e.g. 09516495356)..."
                  className="bg-white border-emerald-200 text-sm h-10"
                />
                <Button
                  onClick={handleSendTestSms}
                  disabled={sendingTestSms || !testPhoneNumber}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 h-10"
                >
                  {sendingTestSms ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending SMS...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test SMS
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Numbers are automatically converted to international format (<code className="text-slate-700">+639XXXXXXXXX</code>).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Actions */}
      <Card className="border-slate-200 bg-white shadow-sm hover-lift">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-slate-900">Account Actions</CardTitle>
          <p className="mt-1 text-sm text-slate-600">Manage your session</p>
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

