export type UserRole = 'MD' | 'SALES' | 'COORDINATOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  attendance: number; // percentage
  callsCount: {
    weekly: number;
    monthly: number;
    yearly: number;
  };
  rank: number;
  manager_email_id?: string;
}

export interface LiveOffer {
  id: string;
  title: string;
  description: string;
  endDate: string;
  link: string;
}

export interface TeamMember extends User {
  performance: number; // 0-100
}

export type EntryType = 'Staff' | 'Sales Lead' | 'Client' | 'Visitor' | 'Interview' | 'Banker' | 'Docs Upload';

export interface CommonEntry {
  id: string;
  timestamp: string;
  type: EntryType;
  source: string;
  campaign?: string;
  data: Record<string, any>;
  status: 'Pending' | 'Processed' | 'Archived';
}

export interface KPIStats {
  totalLeads: number;
  activeCases: number;
  conversionRate: number;
  revenue: number;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}
