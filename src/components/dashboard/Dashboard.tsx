
import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, PieChart, Pie, Cell } from 'recharts';

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
  Send
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
import { motion } from 'motion/react';
import { ConnectionHealth } from './ConnectionHealth';
import { ActivityFeed, mockActivities } from './ActivityFeed';
import { PredictiveTaskEngine } from '../tools/PredictiveTaskEngine';

const ICONS = {
  Users,
  Briefcase,
  TrendingUp,
  Zap,
};

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6'];

export function Dashboard({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/dc/dashboard/${user.id}`);
        const result = await res.json();
        if (result.ok) {
          setDashboardData(result.data);
        } else {
          console.error("Dashboard error:", result.error);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [user.id]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Enterprise Workspace...</div>;
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

      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Top Floating Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-sans font-bold text-gray-900 dark:text-white tracking-tight">Enterprise Overview</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time performance and system metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white dark:bg-navy-900 p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-navy-800">
              <TabsList className="bg-transparent border-none gap-1">
                <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-navy-900 data-[state=active]:text-white gap-2 h-10 px-4">
                  <LayoutDashboard size={16} />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="rounded-xl data-[state=active]:bg-navy-900 data-[state=active]:text-white gap-2 h-10 px-4">
                  <KanbanSquare size={16} />
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="rms" className="rounded-xl data-[state=active]:bg-navy-900 data-[state=active]:text-white gap-2 h-10 px-4">
                  <Contact2 size={16} />
                  RM Directory
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Tabs value={activeTab} className="w-full">
          <TabsContent value="overview" className="space-y-8 mt-0 outline-none">
            <div className="flex gap-3">
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-2xl px-6 h-12 gap-2 shadow-lg shadow-blue-500/20"
                onClick={() => window.open('https://t.me/divyanshicapital', '_blank')}
              >
                <Send size={20} className="ml-1" />
                Telegram
              </Button>
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-6 h-12 gap-2 shadow-lg shadow-emerald-500/20"
                onClick={() => window.open('https://wa.me/917838074351', '_blank')}
              >
                <MessageCircle size={20} />
                WhatsApp Genie
              </Button>
              <Button 
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl px-6 h-12 gap-2 shadow-lg shadow-rose-500/20"
                onClick={() => window.location.href = 'tel:+917838074351'}
              >
                <Phone size={20} />
                Call
              </Button>
              <Button 
                className="bg-navy-900 hover:bg-navy-800 text-white rounded-2xl px-6 h-12 gap-2 shadow-lg shadow-navy-900/20"
                onClick={() => window.location.href = 'mailto:upendra.raghav@divyanshicapital.com'}
              >
                <Mail size={20} />
                Inbox
              </Button>
            </div>

            {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi: any, i: number) => {
            const Icon = ICONS[kpi.icon as keyof typeof ICONS] || Users;
            return (
            <Card key={i} className="border-none shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all duration-300 bg-white dark:bg-navy-900">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={cn("p-3 rounded-2xl", kpi.bg, "dark:bg-opacity-10")}>
                    <Icon className={kpi.color} size={24} />
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
                <div className="mt-4">
                  <p className="text-sm font-sans font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
                  <h3 className="text-3xl font-sans font-bold text-gray-900 dark:text-white mt-1">{kpi.value}</h3>
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
            <div className="h-[350px] w-full" style={{ minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
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

          {/* Side Info */}
          <div className="space-y-8 lg:col-start-3 lg:row-start-1 lg:row-span-2">
            <PredictiveTaskEngine activities={mockActivities} />
            <ShareSmartForm />
            
            <Card className="border-none shadow-sm rounded-3xl p-6 bg-white dark:bg-navy-900">
              <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-lg font-sans font-bold dark:text-white">Loan Distribution</CardTitle>
              </CardHeader>
              <div className="h-[200px] w-full" style={{ minHeight: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
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

      <TabsContent value="pipeline" className="mt-0 outline-none">
        <LeadPipeline leads={liveLeads} />
      </TabsContent>

      <TabsContent value="rms" className="mt-0 outline-none">
        <BankRMDirectory />
      </TabsContent>
    </Tabs>
  </div>
</div>
);
}


