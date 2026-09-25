import React from 'react';
import { ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface IframeModuleProps {
  page: string;
  emp?: string;
  manager_email_id?: string;
}

export function IframeModule({ page, emp, manager_email_id }: IframeModuleProps) {
  // Construct URL query params
  const params = new URLSearchParams();
  params.append('page', page);
  if (emp) params.append('emp', emp);
  if (manager_email_id) params.append('manager_email_id', manager_email_id);

  const proxyUrl = `/api/dc/iframe?${params.toString()}`;

  const handleOpenExternal = () => {
    window.open(proxyUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center bg-gray-50 dark:bg-navy-950 p-6">
      <Card className="max-w-md w-full bg-white dark:bg-navy-900 border-none shadow-xl rounded-3xl overflow-hidden">
        <div className="bg-navy-900 p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-brand-orange/20 rounded-2xl flex items-center justify-center mb-4 text-brand-orange">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-bold text-white font-sans capitalize">
            {page.replace(/_/g, ' ')} Module
          </h2>
          <p className="text-gray-400 text-sm mt-2 font-medium">
            Secure External Application
          </p>
        </div>
        
        <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            For security and performance, this module runs in a dedicated secure window. Click below to launch your session.
          </p>
          
          <Button 
            onClick={handleOpenExternal}
            className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-sm h-12 rounded-xl group"
          >
            Launch Module
            <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <ExternalLink size={12} />
            <span>Opens in a new tab</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
