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

/**
 * Refactored Master Data Case Record structure using SOURCE_NAME as primary identifier.
 * Completely removed deprecated LEAD_ID references.
 */
export interface MasterDataRecord {
  timestamp: string;
  formSource: string;
  fullName: string;
  mobile: string;
  emailId: string;
  cityLocation: string;
  loanType: string;
  requiredLoanAmount: number;
  employmentType: string;
  preferredBank: string;
  bank: string;
  sourceName: string; // Refactored primary case identifier (instead of LEAD_ID)
  docUploadStatus: string;
  caseStatus: string;
  caseRemark: string;
  assignedCoordinatorEmail: string;
  disbursedAmount?: number;
  disbursalDate?: string;
  folderUrl?: string;
}

/**
 * Streamlined Employee Record structure aligned with the system's operational needs,
 * purging unnecessary or redundant columns to secure and optimize the metadata.
 */
export interface EmployeeRecord {
  empCode: string;
  employeeName: string;
  role: UserRole;
  department: string;
  employeeEmailId: string;
  mobile: string;
  managerName?: string;
  managerEmailId?: string;
  reportingHead?: string;
  activeStatus: 'ACTIVE' | 'INACTIVE';
  accessLevel: number;
  joiningDate?: string;
}
