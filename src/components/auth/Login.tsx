import { apiFetch } from "@/lib/api";
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowRight, User as UserIcon, Briefcase, LayoutDashboard, Lock, User as UserCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole, User } from '@/types';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (user: User) => void;
}

import { DivyanshiLogo } from '@/components/ui/Logo';

export function Login({ onLogin }: LoginProps) {
  const [empCode, setEmpCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'session_expired_id_mismatch') {
      setErrorMsg('Session Expired: ID Mismatch');
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } else {
      const storedErr = localStorage.getItem('dc_login_error');
      if (storedErr) {
        setErrorMsg(storedErr);
        localStorage.removeItem('dc_login_error');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiFetch('/api/dc/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ empCode, password })
      });
      
      if (!response.ok) {
        throw new Error('Connection or configuration error.');
      }
      
      const result = await response.json();
      
      if (result.ok === true && result.data && result.data.employee) {
        const emp = result.data.employee;
        const role = emp.role || (empCode === 'DC002' ? 'MD' : 'SALES');
        const user: User = {
          id: emp.id || empCode,
          name: emp.name || 'Staff Member',
          email: emp.email || `${role.toLowerCase()}@divyanshicapital.com`,
          role: role as UserRole,
          department: emp.department || 'Sales',
          attendance: emp.attendance || 100,
          callsCount: emp.callsCount || { weekly: 0, monthly: 0, yearly: 0 },
          rank: emp.rank || 1,
          manager_email_id: emp.manager_email_id || ''
        };
        if (result.token) {
          localStorage.setItem("dc_token", result.token);
        }
        onLogin(user);
        toast.success(`Welcome back, ${user.name}!`);
      } else {
        toast.error(result.error || 'Invalid Employee Code or PIN');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect to the backend');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empCode) {
      toast.error('Please enter your Employee Code first');
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/dc/auth/forgot-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empCode })
      });
      const result = await response.json();
      if (result.ok) {
        toast.success('OTP sent to your registered contact');
        setMode('reset');
      } else {
        toast.error(result.error || 'Failed to initiate PIN reset');
      }
    } catch (err: any) {
      toast.error('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      toast.error('Please fill all fields');
      return;
    }
    setIsLoading(true);
    try {
      // First verify OTP then reset PIN (Assuming single step for simplicity, or chaining API calls)
      const verifyRes = await apiFetch('/api/dc/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empCode, otp })
      });
      const verifyResult = await verifyRes.json();
      
      if (verifyResult.ok) {
        const resetRes = await apiFetch('/api/dc/auth/reset-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empCode, otp, newPin: newPassword })
        });
        const resetResult = await resetRes.json();
        if (resetResult.ok) {
          toast.success('PIN reset successfully. Please login.');
          setMode('login');
          setPassword('');
        } else {
          toast.error(resetResult.error || 'Failed to reset PIN');
        }
      } else {
        toast.error(verifyResult.error || 'Invalid OTP');
      }
    } catch (err: any) {
      toast.error('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-orange-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-500/10 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <DivyanshiLogo className="w-48 mx-auto mb-6" showText={true} dark={true} />
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-xl">
              {mode === 'login' && "Enterprise Portal"}
              {mode === 'forgot' && "Forgot PIN"}
              {mode === 'reset' && "Reset PIN"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {mode === 'login' && "Enter your credentials to continue"}
              {mode === 'forgot' && "Enter employee code to receive OTP"}
              {mode === 'reset' && "Enter OTP and new PIN"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {errorMsg && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 font-mono font-bold animate-pulse">
                <ShieldCheck className="text-red-500 shrink-0" size={16} />
                <span>{errorMsg}</span>
              </div>
            )}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Employee Code</label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text"
                      value={empCode}
                      onChange={(e) => setEmpCode(e.target.value)}
                      placeholder="DC002"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">6-Digit PIN</label>
                    <button type="button" onClick={() => setMode('forgot')} className="text-xs text-brand-orange hover:underline">Forgot?</button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0,6))}
                      placeholder="••••••"
                      maxLength={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-10 text-white outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all text-center tracking-[0.5em]"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit"
                  className="w-full py-7 rounded-2xl bg-brand-orange hover:bg-brand-orange/90 text-navy-900 font-sans font-bold text-lg mt-4 shadow-xl shadow-brand-orange/20 disabled:opacity-50"
                  disabled={isLoading || !empCode || !password}
                >
                  {isLoading ? "Authenticating..." : "Enter Workspace"}
                </Button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Employee Code</label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text"
                      value={empCode}
                      onChange={(e) => setEmpCode(e.target.value)}
                      placeholder="DC002"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="w-full rounded-2xl py-6 border-white/10 text-gray-300" onClick={() => setMode('login')}>Back</Button>
                  <Button 
                    type="submit"
                    className="w-full py-6 rounded-2xl bg-brand-orange hover:bg-brand-orange/90 text-navy-900 font-sans font-bold shadow-xl shadow-brand-orange/20 disabled:opacity-50"
                    disabled={isLoading || !empCode}
                  >
                    {isLoading ? "Sending..." : "Send OTP"}
                  </Button>
                </div>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">OTP Code</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all text-center tracking-[0.5em]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">New 6-Digit PIN</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, '').slice(0,6))}
                      placeholder="••••••"
                      maxLength={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-10 text-white outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all text-center tracking-[0.5em]"
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="w-full rounded-2xl py-6 border-white/10 text-gray-300" onClick={() => setMode('login')}>Cancel</Button>
                  <Button 
                    type="submit"
                    className="w-full py-6 rounded-2xl bg-brand-orange hover:bg-brand-orange/90 text-navy-900 font-sans font-bold shadow-xl shadow-brand-orange/20 disabled:opacity-50"
                    disabled={isLoading || !otp || !newPassword}
                  >
                    {isLoading ? "Resetting PIN..." : "Reset PIN"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-xs mt-8 font-mono uppercase tracking-widest">
          Secure Enterprise Access • v2.4.0
        </p>
      </motion.div>
    </div>
  );
}

