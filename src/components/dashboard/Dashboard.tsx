
import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

import {
  ExternalLink,
  TrendingUp,
  Users,
  Briefcase,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
  Phone,
  Calendar,
  Trophy,
  Star,
  Mail,
  MessageCircle,
  LayoutDashboard,
  KanbanSquare,
  Contact2,
  Search,
  Bell,
  Filter,
  Target,
  ArrowRight,
  Send,
  RefreshCw,
  Edit3,
  Plus,
  Check,
  ShieldCheck,
  FileText,
  Settings,
  Sparkles,
  Tag,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiveOfferMarquee } from './LiveOfferMarquee';
import { ShareSmartForm } from './ShareSmartForm';
import { LeadPipeline } from './LeadPipeline';
import { BankRMDirectory } from '../tools/BankRMDirectory';
import { User, TeamMember } from '@/types';
import { useEmployeeSync } from '@/lib/sync';
import { HrDiscrepancyPanel } from './HrDiscrepancyPanel';
import { motion } from 'motion/react';
import { ConnectionHealth } from './ConnectionHealth';
import { exportDeropoCSV } from '@/lib/export';
import { ActivityFeed, mockActivities } from './ActivityFeed';
import { PredictiveTaskEngine } from '../tools/PredictiveTaskEngine';
import { TaskPriorityQueue } from './TaskPriorityQueue';

const ICONS = {
  Users,
  Briefcase,
  TrendingUp,
  Zap,
};

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6'];

export function Dashboard({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<any>(() => {
    try {
      const cached = localStorage.getItem(`dc_dash_cache_${user.id}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!dashboardData);

  const {
    employees,
    isSyncing,
    lastSyncedAt,
    triggerSync: fetchEmployees,
    setEmployees
  } = useEmployeeSync();

  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isEditingExisting = !!editingEmployee && employees.some(e => e.empCode === editingEmployee.empCode && e.empCode !== '');

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !editingEmployee.empCode || !editingEmployee.employeeName) {
      toast.error('Employee Code and Full Name are mandatory.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiFetch('/api/dc/employee-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee: editingEmployee })
      });
      const result = await res.json();
      if (result.ok) {
        toast.success(`Saved mappings for employee ${editingEmployee.empCode}`);
        setEditingEmployee(null);
        if (Array.isArray(result.data)) {
          setEmployees(result.data);
          localStorage.setItem('dc_employee_sync_data', JSON.stringify(result.data));
        } else {
          fetchEmployees(true);
        }
      } else {
        toast.error(result.error || 'Failed to save employee mappings');
      }
    } catch (err) {
      toast.error('Failed to commit employee record due to connection limitations.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    async function loadDashboard() {
      try {
        if (!dashboardData) setLoading(true);
        const res = await apiFetch(`/api/dc/dashboard/${user.id}`);
        const result = await res.json();
        if (result.ok) {
          setDashboardData(result.data);
          try {
            localStorage.setItem(`dc_dash_cache_${user.id}`, JSON.stringify(result.data));
          } catch {}
        } else {
          console.debug("Dashboard fetch status:", result.error);
        }
      } catch (err: any) {
        console.debug("Failed to fetch dashboard, using fallback.", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [user.id]);

  useEffect(() => {
    const handleSwitchDashTab = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab: string }>;
      if (customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };
    window.addEventListener('dc-switch-dash-tab', handleSwitchDashTab);
    return () => {
      window.removeEventListener('dc-switch-dash-tab', handleSwitchDashTab);
    };
  }, []);

  if (loading && !dashboardData) {
    return (
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-pulse">
        {/* Top Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-9 w-64 bg-gray-200 dark:bg-navy-800 rounded-xl" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-navy-800 rounded-lg" />
          </div>
          <div className="h-10 w-96 bg-gray-200 dark:bg-navy-800 rounded-2xl" />
        </div>

        {/* Quick Action Buttons Skeleton */}
        <div className="flex gap-3">
          <div className="h-12 w-28 bg-gray-200 dark:bg-navy-800 rounded-2xl" />
          <div className="h-12 w-36 bg-gray-200 dark:bg-navy-800 rounded-2xl" />
          <div className="h-12 w-24 bg-gray-200 dark:bg-navy-800 rounded-2xl" />
          <div className="h-12 w-28 bg-gray-200 dark:bg-navy-800 rounded-2xl" />
        </div>

        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-navy-900 p-6 rounded-3xl h-36 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-gray-200 dark:bg-navy-800 rounded-2xl" />
                <div className="w-16 h-6 bg-gray-200 dark:bg-navy-800 rounded-lg" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-navy-800 rounded-md" />
                <div className="h-7 w-20 bg-gray-200 dark:bg-navy-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Personal & Team Performance Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-navy-900 p-6 rounded-3xl h-96 flex flex-col justify-between shadow-sm">
            <div className="space-y-3">
              <div className="h-6 w-48 bg-white/10 rounded-lg" />
              <div className="h-4 w-32 bg-white/10 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-white/5 rounded-2xl" />
              <div className="h-20 bg-white/5 rounded-2xl" />
            </div>
            <div className="h-12 bg-white/5 rounded-2xl" />
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-navy-900 p-6 rounded-3xl h-96 flex flex-col justify-between shadow-sm">
            <div className="space-y-3">
              <div className="h-6 w-40 bg-gray-200 dark:bg-navy-800 rounded-lg" />
              <div className="h-4 w-60 bg-gray-200 dark:bg-navy-800 rounded-md" />
            </div>
            <div className="h-64 bg-gray-100 dark:bg-navy-800/50 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || [];
  const teamMembers = dashboardData?.team || [];
  const chartData = dashboardData?.chart || [];
  const pieData = dashboardData?.pie || [];
  const liveLeads = dashboardData?.leads || [];

  return (
    <div className="space-y-0">
      {/* Live Offer Marquee */}
      <LiveOfferMarquee />

      <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
        {/* Top Floating Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-sans font-bold text-gray-900 dark:text-white tracking-tight">Enterprise Overview</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Real-time data connection active" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Real-time performance and system metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white dark:bg-navy-900 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-navy-800">
              <TabsList className="bg-transparent border-none gap-1">
                <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-navy-900 data-[state=active]:text-white gap-1.5 h-8 px-3 text-xs">
                  <LayoutDashboard size={14} />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-navy-900 data-[state=active]:text-white gap-1.5 h-8 px-3 text-xs">
                  <Tag size={14} />
                  Priority Tasks
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="rounded-lg data-[state=active]:bg-navy-900 data-[state=active]:text-white gap-1.5 h-8 px-3 text-xs">
                  <KanbanSquare size={14} />
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="rms" className="rounded-lg data-[state=active]:bg-navy-900 data-[state=active]:text-white gap-1.5 h-8 px-3 text-xs">
                  <Contact2 size={14} />
                  RM Directory
                </TabsTrigger>
                <TabsTrigger value="hr-sync" className="rounded-lg data-[state=active]:bg-navy-900 data-[state=active]:text-white gap-1.5 h-8 px-3 text-xs">
                  <Users size={14} />
                  HR Staff Sync
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Tabs value={activeTab} className="w-full">
          <TabsContent value="overview" className="space-y-5 mt-0 outline-none">
            <div className="flex flex-wrap gap-2.5">
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 h-9 text-xs gap-1.5 shadow-sm"
                onClick={() => window.open('https://t.me/divyanshicapital', '_blank')}
              >
                <Send size={15} />
                Telegram
              </Button>
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 h-9 text-xs gap-1.5 shadow-sm"
                onClick={() => window.open('https://wa.me/917838074351', '_blank')}
              >
                <MessageCircle size={15} />
                WhatsApp Genie
              </Button>
              <Button 
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-4 h-9 text-xs gap-1.5 shadow-sm"
                onClick={() => window.location.href = 'tel:+917838074351'}
              >
                <Phone size={15} />
                Call
              </Button>
              <Button 
                className="bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-4 h-9 text-xs gap-1.5 shadow-sm"
                onClick={() => window.location.href = 'mailto:upendra.raghav@divyanshicapital.com'}
              >
                <Mail size={15} />
                Inbox
              </Button>
              {user.role === 'MD' && (
                <Button 
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-4 h-9 text-xs gap-1.5 shadow-sm"
                  onClick={() => exportDeropoCSV(liveLeads)}
                  title="Export leads formatted for Deropo Marketing Campaign"
                >
                  <Download size={15} />
                  Deropo CSV Export
                </Button>
              )}
            </div>

            {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi: any, i: number) => {
            const Icon = ICONS[kpi.icon as keyof typeof ICONS] || Users;
            return (
            <Card key={i} className="border-none shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-all duration-300 bg-white dark:bg-navy-900">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className={cn("p-2.5 rounded-xl", kpi.bg, "dark:bg-opacity-10")}>
                    <Icon className={kpi.color} size={20} />
                  </div>
                  {kpi.change ? (
                    <Badge variant="outline" className={cn(
                      "rounded-lg border-none font-mono text-[10px]",
                      kpi.change.startsWith('+') ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600"
                    )}>
                      {kpi.change.startsWith('+') ? <ArrowUpRight size={12} className="mr-1 inline" /> : <ArrowDownRight size={12} className="mr-1 inline" />}
                      {kpi.change}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-lg border-none font-mono text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
                      <ArrowUpRight size={12} className="mr-1 inline" />
                      +0%
                    </Badge>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-xs font-sans font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
                  <h3 className="text-2xl font-sans font-bold text-gray-900 dark:text-white mt-0.5">{kpi.value}</h3>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>

        {/* Personal & Team Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Personal Performance */}
          <Card className="border-none shadow-sm rounded-3xl p-6 bg-navy-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Trophy size={120} />
            </div>
            <CardHeader className="px-0 pt-0 pb-6 relative z-10">
              <CardTitle className="text-xl font-sans font-bold">Personal Performance</CardTitle>
              <CardDescription className="text-white/60">Your current standing and activity</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 text-gold-500 mb-1">
                    <Calendar size={14} />
                    <span className="text-[10px] uppercase tracking-widest font-mono">Attendance</span>
                  </div>
                  <p className="text-2xl font-sans font-bold">{user.attendance || 0}%</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 text-brand-orange mb-1">
                    <Phone size={14} />
                    <span className="text-[10px] uppercase tracking-widest font-mono">Calls (W)</span>
                  </div>
                  <p className="text-2xl font-sans font-bold">{user.callsCount?.weekly || 0}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Monthly Target</span>
                  <span className="text-gold-500 font-bold">82%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '82%' }}
                    className="h-full bg-gradient-to-r from-gold-500 to-brand-orange"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center text-navy-900">
                  <Star size={20} fill="currentColor" />
                </div>
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-widest font-mono">Current Rank</p>
                  <p className="text-lg font-sans font-bold text-gold-500">#{user.rank || 1} in Department</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-sans font-bold text-white mb-1">Digital Business Card</h4>
                    <p className="text-xs text-white/60">Your public professional profile</p>
                  </div>
                  <a 
                    href={`${process.env.P1_EXEC_URL || ''}?empCode=${user.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <ExternalLink size={16} />
                    View Profile
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Leaderboard */}
          <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl p-6 bg-white dark:bg-navy-900">
            <CardHeader className="px-0 pt-0 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-sans font-bold dark:text-white">Department Rankings</CardTitle>
                  <CardDescription className="dark:text-gray-400">Top performers this month</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-xs rounded-lg dark:text-gray-400 dark:hover:bg-navy-800">Weekly</Button>
                  <Button variant="secondary" size="sm" className="text-xs rounded-lg bg-navy-900 dark:bg-white text-white dark:text-navy-900">Monthly</Button>
                  <Button variant="ghost" size="sm" className="text-xs rounded-lg dark:text-gray-400 dark:hover:bg-navy-800">Yearly</Button>
                </div>
              </div>
            </CardHeader>
            <div className="space-y-4">
              {teamMembers.map((member: any, i: number) => (
                <div key={member.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-navy-800 rounded-2xl transition-colors group">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-lg",
                    i === 0 ? "bg-gold-500 text-navy-900" : "bg-gray-100 dark:bg-navy-800 text-gray-400 dark:text-gray-500"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-sans font-bold text-gray-900 dark:text-white">{member.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.department}</p>
                  </div>
                  <div className="text-right px-4 border-x border-gray-100 dark:border-navy-800">
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono">Calls</p>
                    <p className="font-sans font-bold text-gray-900 dark:text-white">{member.callsCount?.monthly ?? 0}</p>
                  </div>
                  <div className="w-32">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-400 dark:text-gray-500 uppercase font-mono">Score</span>
                      <span className="font-bold text-navy-900 dark:text-white">{member.performance}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-navy-800 rounded-full overflow-hidden">
                      <div className="h-full bg-navy-900 dark:bg-white" style={{ width: `${member.performance}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl p-6 bg-white dark:bg-navy-900">
            <CardHeader className="px-0 pt-0 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-sans font-bold tracking-tight dark:text-white">Performance Overview</CardTitle>
                  <CardDescription className="dark:text-gray-400">Weekly leads vs processed cases</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none rounded-lg px-3 py-1">Leads</Badge>
                  <Badge variant="secondary" className="bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-none rounded-lg px-3 py-1">Cases</Badge>
                </div>
              </div>
            </CardHeader>
            <div className="w-full h-[350px] min-h-[200px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-navy-800" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)'
                    }}
                  />
                  <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                  <Area type="monotone" dataKey="cases" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorCases)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
          <div className="lg:col-span-2">
            <ActivityFeed />
          </div>

          <div className="lg:col-span-2">
            <TaskPriorityQueue />
          </div>

          {/* Side Info */}
          <div className="space-y-8 lg:col-start-3 lg:row-start-1 lg:row-span-2">
            <PredictiveTaskEngine activities={mockActivities} />
            <ShareSmartForm />
            
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white dark:bg-navy-900">
              <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-lg font-sans font-bold dark:text-white">Loan Distribution</CardTitle>
              </CardHeader>
              <div className="w-full h-[200px] min-h-[200px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {pieData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                    <span className="text-xs font-sans text-gray-500 dark:text-gray-400">{item.name}</span>
                  </div>
                ))}
              </div>
            </Card>

            <ConnectionHealth />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="tasks" className="mt-0 outline-none">
        <TaskPriorityQueue />
      </TabsContent>

      <TabsContent value="pipeline" className="mt-0 outline-none">
        <LeadPipeline leads={liveLeads} userRole={user.role} />
      </TabsContent>

      <TabsContent value="rms" className="mt-0 outline-none">
        <BankRMDirectory />
      </TabsContent>

      <TabsContent value="hr-sync" className="mt-0 outline-none space-y-8">
        {user.role === 'MD' && (
          <HrDiscrepancyPanel 
            employees={employees}
            isSyncing={isSyncing}
            lastSyncedAt={lastSyncedAt}
            onRefresh={() => fetchEmployees(false)}
            onSelectEmployee={(emp) => setEditingEmployee(emp)}
            onSetSearchQuery={(q) => setSearchQuery(q)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List Section */}
          <div className={cn("space-y-6", editingEmployee ? "lg:col-span-2" : "lg:col-span-3")}>
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white dark:bg-navy-900">
              <CardHeader className="px-0 pt-0 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-sans font-bold dark:text-white flex items-center gap-2">
                      <ShieldCheck className="text-emerald-500 w-6 h-6" />
                      Staff Identity & File Mapping Ledger
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400 mt-1">
                      Manage corporate avatars, system roles, email bindings, and Google Drive PERSONAL_FILE_ID mappings.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button 
                      onClick={() => fetchEmployees(false)} 
                      disabled={isSyncing}
                      variant="outline"
                      className="rounded-xl h-10 px-4 gap-2 text-xs font-semibold dark:border-navy-800 dark:hover:bg-navy-800 dark:text-white"
                    >
                      <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
                      Sync Ledger
                    </Button>
                    <Button 
                      onClick={() => setEditingEmployee({
                        empCode: '',
                        employeeName: '',
                        role: 'SALES',
                        department: 'Sales',
                        employeeEmailId: '',
                        mobile: '',
                        activeStatus: 'ACTIVE',
                        accessLevel: 2,
                        personalFileId: '',
                        avatarSeed: ''
                      })}
                      className="bg-navy-900 dark:bg-white text-white dark:text-navy-900 hover:bg-navy-800 dark:hover:bg-gray-100 rounded-xl h-10 px-4 gap-2 text-xs font-bold shadow-sm"
                    >
                      <Plus size={14} />
                      Add Employee
                    </Button>
                  </div>
                </div>

                {lastSyncedAt && (
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mt-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ledger State: Fully Synchronized · Last Sync: {new Date(lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </CardHeader>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Filter employees by name, ID, department, or mapped file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-navy-950 border border-gray-100 dark:border-navy-850 rounded-2xl pl-12 pr-4 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-navy-900 dark:focus:ring-white dark:text-white"
                />
              </div>

              {/* Grid / Table */}
              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-navy-800/50">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-navy-950/50 text-gray-400 font-mono text-[10px] uppercase tracking-wider border-b border-gray-100 dark:border-navy-800/50">
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Employee ID</th>
                      <th className="p-4">Role & Dept</th>
                      <th className="p-4">Personal File Mapping</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-navy-800/40">
                    {employees
                      .filter(emp => {
                        const query = searchQuery.toLowerCase();
                        return (
                          emp.employeeName?.toLowerCase().includes(query) ||
                          emp.empCode?.toLowerCase().includes(query) ||
                          emp.department?.toLowerCase().includes(query) ||
                          emp.employeeEmailId?.toLowerCase().includes(query) ||
                          emp.personalFileId?.toLowerCase().includes(query)
                        );
                      })
                      .map((emp) => (
                        <tr key={emp.empCode} className="hover:bg-gray-50/40 dark:hover:bg-navy-950/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-navy-800 p-0.5 border border-brand-orange/10 shrink-0">
                                <img
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.avatarSeed || emp.employeeName}`}
                                  alt={emp.employeeName}
                                  className="w-full h-full rounded-full"
                                />
                              </div>
                              <div>
                                <p className="font-sans font-bold text-gray-900 dark:text-white text-sm">{emp.employeeName}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{emp.employeeEmailId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs font-bold text-gray-600 dark:text-gray-300">
                            {emp.empCode}
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <Badge className={cn(
                                "rounded-md border-none font-sans text-[10px] font-bold py-0.5 px-2",
                                emp.role === 'MD' ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" :
                                emp.role === 'COORDINATOR' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                                "bg-orange-50 dark:bg-orange-500/10 text-brand-orange"
                              )}>
                                {emp.role}
                              </Badge>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{emp.department}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <FileText className="text-gray-400 shrink-0" size={14} />
                              <span className="font-mono text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[160px]" title={emp.personalFileId}>
                                {emp.personalFileId}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={cn(
                              "rounded-full border-none text-[9px] font-bold px-2 py-0.5",
                              emp.activeStatus === 'ACTIVE' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-navy-800 text-gray-400"
                            )}>
                              {emp.activeStatus}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              onClick={() => setEditingEmployee(emp)}
                              variant="ghost"
                              size="sm"
                              className="rounded-lg h-8 w-8 p-0 dark:hover:bg-navy-800 text-gray-500 hover:text-navy-900 dark:hover:text-white"
                            >
                              <Edit3 size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Edit / Add Sheet Section */}
          {editingEmployee && (
            <div className="lg:col-span-1">
              <Card className="border-none shadow-xl rounded-3xl p-6 bg-white dark:bg-navy-900 border border-gray-100 dark:border-navy-850 sticky top-6">
                <CardHeader className="px-0 pt-0 pb-6 border-b border-gray-100 dark:border-navy-800/60">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-sans font-bold dark:text-white">
                      {isEditingExisting ? `Modify Employee ${editingEmployee.empCode}` : "New Employee Ledger"}
                    </CardTitle>
                    <button 
                      onClick={() => setEditingEmployee(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-white font-sans text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </CardHeader>

                <form onSubmit={handleSaveEmployee} className="pt-6 space-y-4">
                  {/* Dynamic Seed Avatar Preview */}
                  <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-navy-950 rounded-2xl border border-gray-100 dark:border-navy-850">
                    <div className="w-20 h-20 rounded-full border-2 border-brand-orange/20 p-0.5 mb-3">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${editingEmployee.avatarSeed || editingEmployee.employeeName || 'Placeholder'}`} 
                        alt="Avatar Preview" 
                        className="w-full h-full rounded-full"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Live Neural Avatar Preview</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Employee Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. DC015"
                      value={editingEmployee.empCode}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, empCode: e.target.value.toUpperCase() })}
                      disabled={isEditingExisting} // Freeze code for existing employees
                      className="w-full bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white disabled:opacity-60"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rahul Verma"
                      value={editingEmployee.employeeName}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, employeeName: e.target.value })}
                      className="w-full bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Role</label>
                      <select 
                        value={editingEmployee.role}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                        className="w-full bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-2 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                      >
                        <option value="MD">MD</option>
                        <option value="SALES">SALES</option>
                        <option value="COORDINATOR">COORDINATOR</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Department</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Sales, HR, Finance"
                        value={editingEmployee.department}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                        className="w-full bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  {/* Active Status & Access Level Dropdowns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Active Status</label>
                      <select 
                        value={editingEmployee.activeStatus || 'ACTIVE'}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, activeStatus: e.target.value })}
                        className="w-full bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-2 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Access Level</label>
                      <select 
                        value={editingEmployee.accessLevel || 2}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, accessLevel: parseInt(e.target.value, 10) })}
                        className="w-full bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-2 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                      >
                        <option value={1}>1 - Staff Only</option>
                        <option value={2}>2 - Team Head</option>
                        <option value={3}>3 - Director / MD</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="e.g. rahul@divyanshicapital.com"
                      value={editingEmployee.employeeEmailId}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, employeeEmailId: e.target.value })}
                      className="w-full bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Mobile Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. +91-9876543210"
                      value={editingEmployee.mobile}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, mobile: e.target.value })}
                      className="w-full bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Personal File ID Mapping (Google Drive)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. DRIVE-FILE-ID or 1Mk9..."
                      value={editingEmployee.personalFileId}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, personalFileId: e.target.value })}
                      className="w-full bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Avatar seed (Dicebear)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rahul, Sparkles"
                      value={editingEmployee.avatarSeed}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, avatarSeed: e.target.value })}
                      className="w-full bg-white dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                      className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl h-10 text-xs font-bold"
                    >
                      {isSaving ? "Saving Mappings..." : "Save Mapping Ledger"}
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => setEditingEmployee(null)}
                      variant="outline"
                      className="rounded-xl h-10 px-4 text-xs font-semibold dark:border-navy-800 dark:hover:bg-navy-800 dark:text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  </div>
</div>
);
}


