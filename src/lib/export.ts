import { toast } from 'sonner';

/**
 * Deropo External Marketing CSV Exporter (MD Role Exclusive)
 * Standardizes lead records into the Deropo campaign ingestion format.
 */
export function exportDeropoCSV(leads: any[] = []) {
  if (!leads || leads.length === 0) {
    toast.error('No lead records available for Deropo export.');
    return;
  }

  try {
    const headers = [
      'Customer_Name',
      'Phone_Number',
      'Email',
      'Loan_Type',
      'Requested_Amount',
      'City',
      'Case_Status',
      'Sales_Owner',
      'Timestamp'
    ];

    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map((l, idx) => {
      const name = l.CLIENT_NAME || l.FULL_NAME || l.CUSTOMER_NAME || l.client || `Lead #${idx + 1}`;
      const phone = l.PHONE_NUMBER || l.MOBILE || l.phone || '';
      const email = l.EMAIL || l.email || '';
      const loanType = l.LOAN_TYPE || l.type || 'Personal Loan';
      const amount = l.REQUIRED_LOAN_AMOUNT || l.REQUESTED_AMOUNT || l.amount || '';
      const city = l.CITY || l.city || '';
      const status = l.CASE_STATUS || l.status || 'Fresh';
      const owner = l.SALES_NAME || l.owner || 'System';
      const date = l.TIMESTAMP || l.date || new Date().toISOString();

      return [
        escapeCSV(name),
        escapeCSV(phone),
        escapeCSV(email),
        escapeCSV(loanType),
        escapeCSV(amount),
        escapeCSV(city),
        escapeCSV(status),
        escapeCSV(owner),
        escapeCSV(date)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `deropo_marketing_leads_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${leads.length} leads in Deropo Marketing CSV format`);
  } catch (err: any) {
    console.error('Failed to export Deropo CSV:', err);
    toast.error('Failed to generate Deropo CSV export.');
  }
}
