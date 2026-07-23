import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiFetch } from './api';
import { toast } from 'sonner';

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

interface SyncOptions {
  silent?: boolean;
  force?: boolean;
}

interface EmployeeSyncContextType {
  employees: EmployeeSyncData[];
  isSyncing: boolean;
  lastSyncedAt: string;
  triggerSync: (options?: boolean | SyncOptions) => Promise<void>;
  updateEmployeeLocal: (employee: EmployeeSyncData) => void;
  setEmployees: React.Dispatch<React.SetStateAction<EmployeeSyncData[]>>;
}

const EmployeeSyncContext = createContext<EmployeeSyncContextType | undefined>(undefined);

// 5 minutes cache TTL
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

export function EmployeeSyncProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<EmployeeSyncData[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  
  // Coalesce concurrent redundant calls to the same background promise
  const activePromiseRef = useRef<Promise<void> | null>(null);

  const triggerSync = async (options?: boolean | SyncOptions) => {
    // Parse arguments supporting both the legacy signature triggerSync(silent: boolean) and object options
    let silent = false;
    let force = false;

    if (typeof options === 'boolean') {
      silent = options;
    } else if (options && typeof options === 'object') {
      silent = options.silent ?? false;
      force = options.force ?? false;
    }

    // Cache Check: skip if not forced, and we have a fresh cache in state
    if (!force && employees.length > 0 && lastSyncedAt) {
      const lastSyncTime = new Date(lastSyncedAt).getTime();
      const now = Date.now();
      if (now - lastSyncTime < CACHE_EXPIRY_MS) {
        console.log('[EmployeeSync] Skipping redundant API fetch. Local cache is warm.');
        return;
      }
    }

    // Coalesce / request deduplication check
    if (activePromiseRef.current) {
      console.log('[EmployeeSync] Coalescing duplicate sync request into ongoing batch fetch.');
      return activePromiseRef.current;
    }

    if (!silent) setIsSyncing(true);

    const performFetch = async () => {
      try {
        const res = await apiFetch('/api/dc/employee-sync');
        const result = await res.json();
        
        if (result.ok && Array.isArray(result.data)) {
          setEmployees(result.data);
          const syncTime = result.lastSync || new Date().toISOString();
          setLastSyncedAt(syncTime);
          localStorage.setItem('dc_employee_sync_data', JSON.stringify(result.data));
          localStorage.setItem('dc_employee_sync_time', syncTime);
          
          if (!silent) {
            toast.success('ALL_EMPLOYEES Ledger & PERSONAL_FILE_ID Mappings Synchronized');
          }
        } else {
          if (!silent) {
            toast.error('Sync completed but received fallback data.');
          }
        }
      } catch (err) {
        console.error('[EmployeeSync] Failed to sync employees from Apps Script:', err);
        if (!silent) {
          toast.error('Network Timeout: Reverted to cached mappings.');
        }
      } finally {
        activePromiseRef.current = null;
        if (!silent) setIsSyncing(false);
      }
    };

    activePromiseRef.current = performFetch();
    return activePromiseRef.current;
  };

  const updateEmployeeLocal = (employee: EmployeeSyncData) => {
    setEmployees(prev => {
      const idx = prev.findIndex(e => e.empCode === employee.empCode);
      let updated;
      if (idx > -1) {
        updated = [...prev];
        updated[idx] = { ...updated[idx], ...employee };
      } else {
        updated = [...prev, employee];
      }
      localStorage.setItem('dc_employee_sync_data', JSON.stringify(updated));
      return updated;
    });
  };

  // Load cache on init
  useEffect(() => {
    const cachedData = localStorage.getItem('dc_employee_sync_data');
    const cachedTime = localStorage.getItem('dc_employee_sync_time');
    let hasCache = false;
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEmployees(parsed);
          hasCache = true;
        }
        if (cachedTime) setLastSyncedAt(cachedTime);
      } catch (e) {
        console.error('Failed to parse cached employee sync data', e);
      }
    }
    
    // Only perform an initial silent background sync if no cache is found or if the cache is expired
    let shouldSyncOnInit = !hasCache;
    if (hasCache && cachedTime) {
      const lastSyncTime = new Date(cachedTime).getTime();
      if (Date.now() - lastSyncTime >= CACHE_EXPIRY_MS) {
        shouldSyncOnInit = true;
      }
    }

    if (shouldSyncOnInit) {
      triggerSync({ silent: true, force: false });
    }
  }, []);

  return (
    <EmployeeSyncContext.Provider value={{
      employees,
      isSyncing,
      lastSyncedAt,
      triggerSync,
      updateEmployeeLocal,
      setEmployees
    }}>
      {children}
    </EmployeeSyncContext.Provider>
  );
}

export function useEmployeeSync() {
  const context = useContext(EmployeeSyncContext);
  if (context === undefined) {
    throw new Error('useEmployeeSync must be used within an EmployeeSyncProvider');
  }
  return context;
}

export interface SyncHealthReport {
  timestamp: string;
  summary: {
    total: number;
    active: number;
    inactive: number;
    healthy: number;
  };
  discrepancies: {
    missingFile: string[];
    inactiveWithFile: string[];
    duplicates: Record<string, string[]>;
    invalidEmail: string[];
  };
}

export class SyncManager {
  private static cachedReport: SyncHealthReport | null = null;
  private static lastChecked: string = '';

  /**
   * Verifies the integrity of ALL_EMPLOYEES roster and PERSONAL_FILE_ID mappings against the backend.
   * Can be run pre-dashboard load to ensure maximum security and ledger compliance.
   */
  public static async verifyIntegrity(force = false): Promise<SyncHealthReport> {
    if (!force && this.cachedReport && this.lastChecked) {
      const elapsed = Date.now() - new Date(this.lastChecked).getTime();
      if (elapsed < 30 * 1000) { // 30s cache
        return this.cachedReport;
      }
    }

    try {
      const response = await apiFetch('/api/dc/sync-integrity');
      if (!response.ok) {
        throw new Error(`Sync verification failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to complete ledger integrity audit.');
      }

      const report: SyncHealthReport = {
        timestamp: data.timestamp,
        summary: data.summary,
        discrepancies: data.discrepancies
      };

      this.cachedReport = report;
      this.lastChecked = new Date().toISOString();
      
      // Save report in local storage for access by UI monitors
      localStorage.setItem('dc_sync_health_report', JSON.stringify(report));
      localStorage.setItem('dc_sync_health_checked_at', this.lastChecked);

      // Dispatch a custom event to notify components that sync health has been updated
      window.dispatchEvent(new CustomEvent('dc-sync-health-updated', { detail: report }));

      return report;
    } catch (error) {
      console.error('[SyncManager] Failed to verify roster integrity:', error);
      // Fallback local analysis if backend fails
      const fallback = this.getLocalFallbackReport();
      this.cachedReport = fallback;
      return fallback;
    }
  }

  /**
   * Retrieves the current sync health report (cached or from local storage).
   */
  public static getReport(): SyncHealthReport | null {
    if (this.cachedReport) return this.cachedReport;
    
    const stored = localStorage.getItem('dc_sync_health_report');
    if (stored) {
      try {
        this.cachedReport = JSON.parse(stored);
        return this.cachedReport;
      } catch {
        return null;
      }
    }
    return null;
  }

  private static getLocalFallbackReport(): SyncHealthReport {
    const cachedEmployeesStr = localStorage.getItem('dc_employee_sync_data');
    let emps: any[] = [];
    if (cachedEmployeesStr) {
      try {
        emps = JSON.parse(cachedEmployeesStr) || [];
      } catch {}
    }

    const activeStaff = emps.filter(e => e.activeStatus === 'ACTIVE');
    const inactiveStaff = emps.filter(e => e.activeStatus === 'INACTIVE');

    const missingFile: string[] = [];
    const inactiveWithFile: string[] = [];
    const duplicates: Record<string, string[]> = {};
    const invalidEmail: string[] = [];

    activeStaff.forEach(e => {
      if (!e.personalFileId || e.personalFileId.trim() === '') {
        missingFile.push(e.empCode);
      }
    });

    inactiveStaff.forEach(e => {
      if (e.personalFileId && e.personalFileId.trim() !== '') {
        inactiveWithFile.push(e.empCode);
      }
    });

    const fileIdMap: Record<string, string[]> = {};
    emps.forEach(e => {
      if (e.personalFileId && e.personalFileId.trim() !== '') {
        const id = e.personalFileId.trim();
        if (!fileIdMap[id]) fileIdMap[id] = [];
        fileIdMap[id].push(e.empCode);
      }
    });

    Object.entries(fileIdMap).forEach(([fileId, codes]) => {
      if (codes.length > 1) {
        duplicates[fileId] = codes;
      }
    });

    emps.forEach(e => {
      const email = e.employeeEmailId || '';
      if (!email.includes('@') || !email.endsWith('.com')) {
        invalidEmail.push(e.empCode);
      }
    });

    return {
      timestamp: new Date().toISOString(),
      summary: {
        total: emps.length,
        active: activeStaff.length,
        inactive: inactiveStaff.length,
        healthy: emps.length - (missingFile.length + inactiveWithFile.length)
      },
      discrepancies: {
        missingFile,
        inactiveWithFile,
        duplicates,
        invalidEmail
      }
    };
  }
}

