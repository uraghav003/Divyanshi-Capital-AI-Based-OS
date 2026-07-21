import { apiFetch } from "@/lib/api";
import React, { useState, useEffect } from 'react';
import { Phone, Mail, Building2, User, Search, Plus, ShieldCheck, Globe, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BankRM {
  id: string;
  name: string;
  bank: string;
  phone: string;
  email: string;
  city: string;
  loanType: string;
  designation: string;
}

export function BankRMDirectory() {
  const [rms, setRms] = useState<BankRM[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRMs() {
      try {
        const res = await apiFetch('/api/dc/banks');
        const json = await res.json();
        if (json.ok) {
          setRms(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load banks", err);
      } finally {
        setLoading(false);
      }
    }
    loadRMs();
  }, []);

  const filteredRMs = rms.filter(rm => 
    rm?.name?.toLowerCase().includes(search.toLowerCase()) ||
    rm?.bank?.toLowerCase().includes(search.toLowerCase()) ||
    rm?.city?.toLowerCase().includes(search.toLowerCase()) ||
    rm?.loanType?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
    toast.success(`Calling ${phone}...`);
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
    toast.success(`Opening email to ${email}...`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold text-gray-900 dark:text-white tracking-tight">Bank RM Directory</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Direct contacts for bank relationship managers</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              placeholder="Search by name, bank, or city..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full md:w-64 rounded-xl border-gray-100 dark:border-navy-800 bg-white dark:bg-navy-900"
            />
          </div>
          <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl gap-2">
            <Plus size={18} />
            Add RM
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRMs.map((rm) => (
          <Card key={rm.id} className="border-none shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-navy-900 group hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gray-50 dark:bg-navy-800/50 p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white dark:bg-navy-900 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 dark:border-navy-800">
                    <Building2 className="text-brand-orange" size={24} />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-gray-900 dark:text-white">{rm.bank}</h3>
                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{rm.designation}</p>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-full border-brand-orange/20 text-brand-orange text-[10px] uppercase tracking-tighter">
                  {rm.loanType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 dark:bg-navy-800 rounded-lg">
                  <User size={16} className="text-gray-400" />
                </div>
                <span className="text-sm font-sans font-bold dark:text-white">{rm.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 dark:bg-navy-800 rounded-lg">
                  <MapPin size={16} className="text-gray-400" />
                </div>
                <span className="text-sm font-sans text-gray-500 dark:text-gray-400">{rm.city}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleCall(rm.phone)}
                  className="rounded-xl border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 gap-2 h-11"
                >
                  <Phone size={16} />
                  Call
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleEmail(rm.email)}
                  className="rounded-xl border-blue-100 dark:border-blue-500/20 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 gap-2 h-11"
                >
                  <Mail size={16} />
                  Email
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRMs.length === 0 && (
        <div className="text-center py-20 bg-gray-50 dark:bg-navy-800/30 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-navy-800">
          <div className="w-16 h-16 bg-gray-100 dark:bg-navy-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-sans font-bold text-gray-900 dark:text-white">No RMs found</h3>
          <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}
