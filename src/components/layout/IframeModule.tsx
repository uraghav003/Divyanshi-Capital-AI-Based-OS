import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface IframeModuleProps {
  page: string;
  emp?: string;
  manager_email_id?: string;
}

export function IframeModule({ page, emp, manager_email_id }: IframeModuleProps) {
  const [loading, setLoading] = useState(true);

  // Construct URL query params
  const params = new URLSearchParams();
  params.append('page', page);
  if (emp) params.append('emp', emp);
  if (manager_email_id) params.append('manager_email_id', manager_email_id);

  const url = `/api/dc/iframe?${params.toString()}`;

  return (
    <div className="w-full h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-navy-950 z-10">
          <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
        </div>
      )}
      <iframe 
        src={url}
        className="w-full h-full border-none"
        onLoad={() => setLoading(false)}
        allow="microphone; camera"
      />
    </div>
  );
}
