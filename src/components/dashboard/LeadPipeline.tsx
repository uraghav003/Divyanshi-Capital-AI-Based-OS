import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MoreHorizontal, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Building2, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportDeropoCSV } from '@/lib/export';

const COLUMNS = [
  { id: 'fresh', label: 'Fresh Leads', color: 'bg-blue-500' },
  { id: 'login', label: 'Login Done', color: 'bg-orange-500' },
  { id: 'query', label: 'Bank Query', color: 'bg-rose-500' },
  { id: 'approved', label: 'Approved', color: 'bg-emerald-500' },
  { id: 'disbursed', label: 'Disbursed', color: 'bg-brand-orange' },
];

export function LeadPipeline({ leads = [], userRole }: { leads?: any[]; userRole?: string }) {
  const normalizedLeads = leads.map((l: any, idx) => {
    if (l && l.id && l.client && l.status) return l;

    const clientName = l.CLIENT_NAME || l.FULL_NAME || l.CUSTOMER_NAME || l.client || `Client #${idx + 1}`;
    const statusRaw = String(l.CASE_STATUS || l.status || 'fresh').toLowerCase();
    
    let status = 'fresh';
    if (statusRaw.includes('disbursed') || statusRaw.includes('disburs')) status = 'disbursed';
    else if (statusRaw.includes('approved') || statusRaw.includes('approv')) status = 'approved';
    else if (statusRaw.includes('query') || statusRaw.includes('hold')) status = 'query';
    else if (statusRaw.includes('login') || statusRaw.includes('done') || statusRaw.includes('progress')) status = 'login';
    
    const amount = l.REQUIRED_LOAN_AMOUNT || l.REQUESTED_AMOUNT || l.amount || 'N/A';
    const formattedAmount = typeof amount === 'number' 
      ? `₹${amount.toLocaleString('en-IN')}` 
      : String(amount).startsWith('₹') ? amount : `₹${amount}`;

    return {
      id: l.SOURCE_NAME || l.CLIENT_ID || l.id || `lead-${idx}`,
      client: clientName,
      type: l.LOAN_TYPE || l.type || 'Personal Loan',
      bank: l.PREFERRED_BANK || l.BANK || l.bank || 'Any',
      amount: formattedAmount,
      owner: l.SALES_NAME || l.owner || 'System AI',
      date: l.TIMESTAMP ? new Date(l.TIMESTAMP).toLocaleDateString('en-IN') : (l.date || 'Today'),
      status: status,
      rawStatus: l.CASE_STATUS || l.status
    };
  });

  const getLeadsByStatus = (status: string) => normalizedLeads.filter(l => l.status === status);

  const handleAdvanceStatus = (sourceName: string, currentStatus: string) => {
    toast.error('Status updates must be done via the main CRM portal');
  };

  const handleRefresh = () => {
    toast.info('Dashboard refresh handles pipeline sync');
  };

  return (
    <div className="space-y-6 h-[calc(100vh-180px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-sans font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            Lead Pipeline
            <Badge className="bg-orange-500/10 text-orange-600 border-none rounded-full px-2.5 py-0.5 text-xs font-mono font-bold">
              Synced Live
            </Badge>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Visual workflow of active cases. Hover or click to advance pipeline status.</p>
        </div>
        <div className="flex items-center gap-3">
          {userRole === 'MD' && (
            <Button
              onClick={() => exportDeropoCSV(leads)}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl gap-2 shadow-sm text-xs h-9 px-3"
              title="Export all leads for Deropo Marketing Campaign"
            >
              <Download size={15} />
              Deropo CSV Export
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            className="rounded-xl gap-2 border-gray-100 dark:border-navy-800 text-gray-600 dark:text-gray-300"
          >
            <RefreshCw size={16} />
            Force Sync
          </Button>
          <Button variant="outline" className="rounded-xl gap-2 border-gray-100 dark:border-navy-800">
            <Filter size={18} />
            Filter
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 h-full min-w-[1200px]">
            {COLUMNS.map((column) => (
              <div key={column.id} className="w-80 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", column.color)} />
                    <h3 className="font-sans font-bold text-sm dark:text-white uppercase tracking-wider">{column.label}</h3>
                    <Badge variant="secondary" className="rounded-full text-[10px] bg-gray-100 dark:bg-navy-800">
                      {getLeadsByStatus(column.id).length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <MoreHorizontal size={16} className="text-gray-400" />
                  </Button>
                </div>

                <div className="flex-1 bg-gray-50/50 dark:bg-navy-900/30 rounded-[2rem] p-4 space-y-4 overflow-y-auto border border-gray-100 dark:border-navy-800/50">
                  {getLeadsByStatus(column.id).map((lead) => (
                    <motion.div
                      key={lead.id}
                      layoutId={lead.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-navy-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-navy-800 group hover:shadow-md transition-all relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-tighter border-gray-100 dark:border-navy-800">
                          {lead.type}
                        </Badge>
                        <span className="text-[10px] text-gray-400 font-mono">{lead.date}</span>
                      </div>
                      
                      <h4 className="font-sans font-bold text-gray-900 dark:text-white mb-1">{lead.client}</h4>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                        <Building2 size={12} />
                        <span>{lead.bank} Bank</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="font-bold text-navy-900 dark:text-white">{lead.amount}</span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-navy-800">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <User size={10} className="text-orange-500" />
                          <span className="font-medium truncate max-w-[100px]">{lead.owner || "System AI"}</span>
                        </div>
                        
                        {column.id !== 'disbursed' ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleAdvanceStatus(lead.id, lead.status)}
                            className="h-8 px-2.5 rounded-lg text-brand-orange hover:bg-orange-50 dark:hover:bg-navy-800 gap-1 opacity-90 group-hover:opacity-100 transition-opacity"
                            title="Advance Pipeline"
                          >
                            <span className="text-xs">Advance</span>
                            <ArrowRight size={12} />
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                            <CheckCircle2 size={12} />
                            <span>Done</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  
                  {getLeadsByStatus(column.id).length === 0 && (
                    <div className="py-8 text-center text-xs text-gray-400 italic">
                      No cases at this stage
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}
