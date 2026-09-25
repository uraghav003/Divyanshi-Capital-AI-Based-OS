import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  FileWarning, 
  RefreshCw, 
  UserCheck, 
  UserX, 
  AlertCircle, 
  ChevronRight,
  Database,
  Search,
  Eye,
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SyncManager, SyncHealthReport } from '@/lib/sync';

export interface EmployeeSyncData {
  empCode: string;
  employeeName: string;
  employeeEmailId: string;
  role: string;
  department: string;
  mobile: string;
  activeStatus: string;
  personalFileId: string;
  avatarSeed?: string;
  [key: string]: any;
}

interface HrDiscrepancyPanelProps {
  employees: EmployeeSyncData[];
  isSyncing: boolean;
  lastSyncedAt: string;
  onRefresh: () => Promise<void>;
  onSelectEmployee: (emp: EmployeeSyncData) => void;
  onSetSearchQuery: (query: string) => void;
}

export interface DiscrepancyIssue {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'MISSING_FILE' | 'INACTIVE_WITH_FILE' | 'DUPLICATE_FILE' | 'INVALID_EMAIL' | 'MISSING_CODE';
  title: string;
  description: string;
  affectedCount: number;
  employees: EmployeeSyncData[];
}

export function HrDiscrepancyPanel({
  employees,
  isSyncing,
  lastSyncedAt,
  onRefresh,
  onSelectEmployee,
  onSetSearchQuery
}: HrDiscrepancyPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<SyncHealthReport | null>(() => SyncManager.getReport());
  const [isVerifyingHealth, setIsVerifyingHealth] = useState(false);

  React.useEffect(() => {
    if (!syncReport) {
      SyncManager.verifyIntegrity().then(setSyncReport).catch(err => console.warn('Failed to verify integrity:', err.message));
    }

    const handleSyncUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SyncHealthReport>;
      setSyncReport(customEvent.detail);
    };

    window.addEventListener("dc-sync-health-updated", handleSyncUpdate);
    return () => {
      window.removeEventListener("dc-sync-health-updated", handleSyncUpdate);
    };
  }, [syncReport]);

  const handleVerifyHealth = async () => {
    setIsVerifyingHealth(true);
    try {
      const report = await SyncManager.verifyIntegrity(true);
      setSyncReport(report);
    } catch (error) {
      console.error(error);
    } finally {
      setIsVerifyingHealth(false);
    }
  };

  // Analyze ledger data for sync discrepancies
  const discrepancies = useMemo(() => {
    const issues: DiscrepancyIssue[] = [];
    const activeStaff = employees.filter(e => e.activeStatus === 'ACTIVE');
    const inactiveStaff = employees.filter(e => e.activeStatus === 'INACTIVE');

    // 1. Missing PERSONAL_FILE_ID mappings for ACTIVE employees
    const missingFileEmps = activeStaff.filter(
      e => !e.personalFileId || e.personalFileId.trim() === ''
    );
    if (missingFileEmps.length > 0) {
      issues.push({
        id: 'missing-file',
        type: 'critical',
        category: 'MISSING_FILE',
        title: 'Missing Personal File Mapping',
        description: 'Active staff members missing a designated Google Drive PERSONAL_FILE_ID.',
        affectedCount: missingFileEmps.length,
        employees: missingFileEmps
      });
    }

    // 2. Mapped PERSONAL_FILE_ID for INACTIVE staff (Security exposure)
    const inactiveWithFileEmps = inactiveStaff.filter(
      e => e.personalFileId && e.personalFileId.trim() !== ''
    );
    if (inactiveWithFileEmps.length > 0) {
      issues.push({
        id: 'inactive-with-file',
        type: 'critical',
        category: 'INACTIVE_WITH_FILE',
        title: 'Security Risk: Inactive with Mapped File',
        description: 'Inactive employees still retaining Google Drive PERSONAL_FILE_ID references.',
        affectedCount: inactiveWithFileEmps.length,
        employees: inactiveWithFileEmps
      });
    }

    // 3. Duplicate PERSONAL_FILE_ID mappings (Crosstalk risk)
    const fileIdMap: Record<string, EmployeeSyncData[]> = {};
    employees.forEach(e => {
      if (e.personalFileId && e.personalFileId.trim() !== '') {
        const id = e.personalFileId.trim();
        if (!fileIdMap[id]) fileIdMap[id] = [];
        fileIdMap[id].push(e);
      }
    });

    const duplicateFileEmps: EmployeeSyncData[] = [];
    Object.entries(fileIdMap).forEach(([fileId, emps]) => {
      if (emps.length > 1) {
        duplicateFileEmps.push(...emps);
      }
    });

    if (duplicateFileEmps.length > 0) {
      issues.push({
        id: 'duplicate-file',
        type: 'warning',
        category: 'DUPLICATE_FILE',
        title: 'Duplicate File ID Conflict',
        description: 'Multiple employees sharing the identical PERSONAL_FILE_ID mapping.',
        affectedCount: duplicateFileEmps.length,
        employees: duplicateFileEmps
      });
    }

    // 4. Invalid/Non-corporate email addresses
    const invalidEmailEmps = employees.filter(e => {
      const email = e.employeeEmailId || '';
      return !email.includes('@') || !email.endsWith('.com');
    });
    if (invalidEmailEmps.length > 0) {
      issues.push({
        id: 'invalid-email',
        type: 'info',
        category: 'INVALID_EMAIL',
        title: 'Corporate Email Non-Compliance',
        description: 'Staff profiles without standard corporate or properly formatted emails.',
        affectedCount: invalidEmailEmps.length,
        employees: invalidEmailEmps
      });
    }

    // 5. Missing Employee Code (Critical system error)
    const missingCodeEmps = employees.filter(e => !e.empCode || e.empCode.trim() === '');
    if (missingCodeEmps.length > 0) {
      issues.push({
        id: 'missing-code',
        type: 'critical',
        category: 'MISSING_CODE',
        title: 'Missing System Employee Code',
        description: 'Ledger records without a recognized EMP_CODE identifier.',
        affectedCount: missingCodeEmps.length,
        employees: missingCodeEmps
      });
    }

    return issues;
  }, [employees]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.activeStatus === 'ACTIVE').length;
    const activeWithFile = employees.filter(e => e.activeStatus === 'ACTIVE' && e.personalFileId && e.personalFileId.trim() !== '').length;
    const coverage = active > 0 ? Math.round((activeWithFile / active) * 100) : 100;
    const totalIssues = discrepancies.reduce((acc, curr) => acc + curr.affectedCount, 0);

    return {
      total,
      active,
      activeWithFile,
      coverage,
      totalIssues
    };
  }, [employees, discrepancies]);

  const handleIssueFilterClick = (issueCategory: string) => {
    if (selectedCategory === issueCategory) {
      setSelectedCategory(null);
      onSetSearchQuery('');
    } else {
      setSelectedCategory(issueCategory);
      // We search for the issue type or specific employee names to filter the main table
      const matchedIssue = discrepancies.find(d => d.category === issueCategory);
      if (matchedIssue && matchedIssue.employees.length > 0) {
        // Set the search query to show first matched employee or a tag
        onSetSearchQuery(matchedIssue.employees[0].employeeName);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* High Integrity Dashboard Header */}
      <div className="bg-gradient-to-br from-navy-900 to-navy-950 dark:from-navy-950 dark:to-navy-990 text-white rounded-3xl p-6 shadow-md border border-navy-850 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <Database size={240} className="text-white transform translate-x-12 -translate-y-12" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5">
            <span className="bg-brand-orange/20 text-brand-orange font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md">
              MD & HR Control Tower
            </span>
            <h3 className="text-xl md:text-2xl font-sans font-bold tracking-tight">
              Staff Identity & File Integrity Center
            </h3>
            <p className="text-xs text-gray-300 max-w-xl">
              Cross-references ALL_EMPLOYEES roster with live Google Drive files mapping. Detects gaps in staff attribution links, invalid access states, and security permissions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 min-w-[120px] text-center">
              <p className="text-[10px] font-mono text-gray-300 uppercase tracking-wider">File Coverage</p>
              <p className="text-2xl font-sans font-black text-emerald-400 mt-1">{stats.coverage}%</p>
            </div>
            
            <Button
              onClick={onRefresh}
              disabled={isSyncing}
              className="bg-brand-orange hover:bg-orange-600 text-white font-sans font-bold text-xs px-5 h-12 rounded-2xl gap-2 shadow-lg shadow-brand-orange/20 transition-all active:scale-95 shrink-0"
            >
              <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
              Run Integrity Audit
            </Button>
          </div>
        </div>

        {lastSyncedAt && (
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono text-gray-400">
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", stats.totalIssues > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500")}></span>
              Status: {stats.totalIssues > 0 ? `${stats.totalIssues} sync items flagged` : 'Zero mapping gaps found'}
            </div>
            <div>
              Last synchronized with Apps Script: {new Date(lastSyncedAt).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      {/* Live Sync Health Monitor (Anti-Slop Grid: Flat visual panels, mathematical padding, zero flashy side-borders) */}
      <div className="bg-white dark:bg-navy-900 border border-gray-100 dark:border-navy-850 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-navy-850/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-orange/10 rounded-2xl text-brand-orange">
              <Database size={20} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-base font-sans font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Live Sync Health Monitor
                {syncReport && (
                  <Badge className={cn(
                    "border-none text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase",
                    syncReport.summary.healthy === syncReport.summary.total
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  )}>
                    {syncReport.summary.healthy === syncReport.summary.total ? 'Optimal' : 'Discrepancies'}
                  </Badge>
                )}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">Automated backend validation tracking ALL_EMPLOYEES and PERSONAL_FILE_ID mappings.</p>
            </div>
          </div>
          <Button 
            onClick={handleVerifyHealth}
            disabled={isVerifyingHealth}
            variant="outline"
            size="sm"
            className="h-10 rounded-xl px-4 border-gray-200 dark:border-navy-800 dark:text-white shrink-0 self-start sm:self-center font-sans font-semibold text-xs gap-1.5"
          >
            <RefreshCw size={13} className={cn(isVerifyingHealth && "animate-spin")} />
            Re-verify Backend Mappings
          </Button>
        </div>

        {syncReport ? (
          <div className="mt-6 space-y-6">
            {/* Health Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50/50 dark:bg-navy-950/40 p-4 rounded-2xl border border-gray-100/50 dark:border-navy-850/30">
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Health Index</p>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-2xl font-black text-gray-900 dark:text-white">
                    {syncReport.summary.total > 0 
                      ? Math.round((syncReport.summary.healthy / syncReport.summary.total) * 100) 
                      : 100}%
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Verified</span>
                </div>
              </div>
              <div className="bg-gray-50/50 dark:bg-navy-950/40 p-4 rounded-2xl border border-gray-100/50 dark:border-navy-850/30">
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Missing Files</p>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className={cn(
                    "text-2xl font-black",
                    syncReport.discrepancies.missingFile.length > 0 ? "text-rose-500" : "text-gray-900 dark:text-white"
                  )}>
                    {syncReport.discrepancies.missingFile.length}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Staff</span>
                </div>
              </div>
              <div className="bg-gray-50/50 dark:bg-navy-950/40 p-4 rounded-2xl border border-gray-100/50 dark:border-navy-850/30">
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Inactive with Access</p>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className={cn(
                    "text-2xl font-black",
                    syncReport.discrepancies.inactiveWithFile.length > 0 ? "text-amber-500" : "text-gray-900 dark:text-white"
                  )}>
                    {syncReport.discrepancies.inactiveWithFile.length}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Leaks</span>
                </div>
              </div>
              <div className="bg-gray-50/50 dark:bg-navy-950/40 p-4 rounded-2xl border border-gray-100/50 dark:border-navy-850/30">
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Duplicate File IDs</p>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className={cn(
                    "text-2xl font-black",
                    Object.keys(syncReport.discrepancies.duplicates).length > 0 ? "text-amber-500 animate-pulse" : "text-gray-900 dark:text-white"
                  )}>
                    {Object.keys(syncReport.discrepancies.duplicates).length}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Conflicts</span>
                </div>
              </div>
            </div>

            {/* Verification details */}
            <div className="flex flex-col gap-2.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
              <div className="flex justify-between border-b border-gray-100/50 dark:border-navy-850/40 pb-2">
                <span>Roster Audit Database:</span>
                <span className="text-gray-900 dark:text-white font-semibold">ALL_EMPLOYEES (Secure Apps Script Source)</span>
              </div>
              <div className="flex justify-between border-b border-gray-100/50 dark:border-navy-850/40 pb-2">
                <span>Integrity Status:</span>
                <span className={cn(
                  "font-semibold",
                  syncReport.summary.healthy === syncReport.summary.total ? "text-emerald-500" : "text-amber-500"
                )}>
                  {syncReport.summary.healthy === syncReport.summary.total 
                    ? "SECURE — All active staff mapped correctly with no security leaks" 
                    : "ATTENTION — System discrepancies found during backend mapping audit"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Verified Timestamp:</span>
                <span className="text-gray-900 dark:text-white">{new Date(syncReport.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-gray-400 font-mono">Loading sync health validation data...</p>
          </div>
        )}
      </div>

      {/* Discrepancy Health Cards (Anti-Slop Grid: Flat visual panels, mathematical padding, zero flashy side-borders) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-gray-100 dark:border-navy-850 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-gray-400">Ledger Roster</span>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
                <UserCheck size={18} className="text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-sans font-black text-gray-900 dark:text-white mt-4">{stats.total}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-50 dark:border-navy-850/50">
            Total recorded staff with {stats.active} marked active.
          </p>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-gray-100 dark:border-navy-850 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-gray-400">Mapped Files</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                <CheckCircle2 size={18} className="text-emerald-500" />
              </div>
            </div>
            <p className="text-3xl font-sans font-black text-gray-900 dark:text-white mt-4">{stats.activeWithFile}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-50 dark:border-navy-850/50">
            Active staff with valid Google Drive folders.
          </p>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-gray-100 dark:border-navy-850 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-gray-400">Total Flagged Items</span>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
                <AlertCircle size={18} className={stats.totalIssues > 0 ? "text-amber-500" : "text-gray-400"} />
              </div>
            </div>
            <p className="text-3xl font-sans font-black text-gray-900 dark:text-white mt-4">{stats.totalIssues}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-50 dark:border-navy-850/50">
            Mapping mismatches requiring HR resolution.
          </p>
        </div>
      </div>

      {/* Flagged Issues List */}
      <div className="bg-white dark:bg-navy-900 rounded-3xl border border-gray-100 dark:border-navy-850 p-6 space-y-6">
        <div>
          <h4 className="text-lg font-sans font-bold text-gray-900 dark:text-white">Active Ledger Discrepancies</h4>
          <p className="text-xs text-gray-400 mt-1">Select an issue below to automatically filter the roster table or edit profiles.</p>
        </div>

        {discrepancies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-gray-50/50 dark:bg-navy-950/40 rounded-2xl border border-dashed border-gray-100 dark:border-navy-850">
            <CheckCircle2 size={36} className="text-emerald-500 mb-3" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">All Mappings in Perfect Order</p>
            <p className="text-xs text-gray-400 mt-1">Every active employee has a dedicated corporate folder, with zero security or crosstalk risks detected.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {discrepancies.map((issue) => {
              const isSelected = selectedCategory === issue.category;
              return (
                <div 
                  key={issue.id}
                  className={cn(
                    "rounded-2xl border p-5 transition-all",
                    isSelected 
                      ? "border-navy-900 bg-navy-50/20 dark:border-white dark:bg-white/[0.02]" 
                      : "border-gray-100 dark:border-navy-850 hover:bg-gray-50/50 dark:hover:bg-navy-950/30"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className={cn(
                        "p-2.5 rounded-xl shrink-0 mt-0.5",
                        issue.type === 'critical' ? "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400" :
                        issue.type === 'warning' ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" :
                        "bg-blue-50 text-blue-500 dark:bg-blue-950/30 dark:text-blue-400"
                      )}>
                        {issue.type === 'critical' ? <ShieldAlert size={18} /> :
                         issue.type === 'warning' ? <AlertTriangle size={18} /> :
                         <FileWarning size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center flex-wrap gap-2">
                          <h5 className="font-sans font-bold text-gray-900 dark:text-white text-sm">
                            {issue.title}
                          </h5>
                          <Badge className={cn(
                            "border-none text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md uppercase",
                            issue.type === 'critical' ? "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400" :
                            issue.type === 'warning' ? "bg-amber-100 dark:bg-amber-500/10 text-amber-600" :
                            "bg-blue-100 dark:bg-blue-500/10 text-blue-600"
                          )}>
                            {issue.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {issue.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase font-mono">Affected</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{issue.affectedCount} staff</p>
                      </div>
                      <Button
                        onClick={() => handleIssueFilterClick(issue.category)}
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-9 text-xs border-gray-100 dark:border-navy-800 dark:text-white"
                      >
                        {isSelected ? 'Reset Filter' : 'Analyze'}
                        <ChevronRight size={14} className={cn("ml-1 transition-transform", isSelected && "rotate-90")} />
                      </Button>
                    </div>
                  </div>

                  {/* Nested expanded view of affected employees */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-navy-850/60 space-y-3">
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Affected Staff Ledger List</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {issue.employees.map((emp) => (
                          <div 
                            key={emp.empCode} 
                            onClick={() => onSelectEmployee(emp)}
                            className="bg-gray-50 hover:bg-gray-100 dark:bg-navy-950 dark:hover:bg-navy-850 p-3 rounded-xl border border-gray-100 dark:border-navy-850 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-gray-200 p-0.5">
                                <img
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.avatarSeed || emp.employeeName}`}
                                  alt={emp.employeeName}
                                  className="w-full h-full rounded-full"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{emp.employeeName}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{emp.empCode || 'No Code'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-mono text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded">
                                {emp.personalFileId ? 'Mapped' : 'No File'}
                              </span>
                              <Button size="xs" variant="ghost" className="h-6 w-6 p-0">
                                <ChevronRight size={12} className="text-gray-400" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
