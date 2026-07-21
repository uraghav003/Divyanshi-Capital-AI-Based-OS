import React, { useState } from 'react';
import { Share2, Mail, MessageCircle, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const SOURCES = [
  'Sales Team',
  'Manual Calling',
  'GoDial Auto Calling',
  'WhatsApp',
  'Website',
  'DSA',
  'Referral',
  'Walk-in',
  'Instagram',
  'Facebook',
  'LinkedIn',
  'Email Campaign',
  'Bank Referral',
  'MIS',
  'Other'
];

export function ShareSmartForm() {
  const [contact, setContact] = useState('');
  const [source, setSource] = useState('Direct');
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}?tab=entry&source=${encodeURIComponent(source)}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    toast.success('Smart Form link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!contact) {
      toast.error('Please enter a mobile number');
      return;
    }
    const cleanPhone = contact.replace(/\D/g, '');
    const message = encodeURIComponent(`Hello! Please fill out the Divyanshi Capital Smart Entry Form here: ${getShareUrl()}`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const handleEmailShare = () => {
    if (!contact || !contact.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    const subject = encodeURIComponent('Divyanshi Capital - Smart Entry Form');
    const body = encodeURIComponent(`Hello,\n\nPlease use the following link to submit your entry:\n\n${getShareUrl()}\n\nRegards,\nDivyanshi Capital Team`);
    window.location.href = `mailto:${contact}?subject=${subject}&body=${body}`;
    toast.success('Opening Email Client...');
  };

  return (
    <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-navy-900 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-orange/10 rounded-xl">
            <Share2 className="text-brand-orange" size={24} />
          </div>
          <div>
            <CardTitle className="text-xl font-sans font-bold dark:text-white">Quick Share Smart Form</CardTitle>
            <CardDescription className="dark:text-gray-400">Send entry links to clients or partners</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">Target Contact (Mobile / Email)</label>
          <Input 
            placeholder="e.g. +919876543210 or client@email.com" 
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="h-12 rounded-xl border-gray-100 dark:border-navy-800 focus:ring-brand-orange/20 dark:bg-navy-800 dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">Tracking Source</label>
          <Select value={source} onValueChange={(val) => { if (val) setSource(val); }}>
            <SelectTrigger className="h-12 rounded-xl border-gray-100 dark:border-navy-800 bg-gray-50/50 dark:bg-navy-800/50 focus:ring-brand-orange/20 dark:text-white">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-gray-100 dark:border-navy-800 bg-white dark:bg-navy-900">
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s} className="rounded-lg dark:text-white dark:focus:bg-navy-800">{s}</SelectItem>
              ))}
              <SelectItem value="Direct" className="rounded-lg dark:text-white dark:focus:bg-navy-800">Direct</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={handleWhatsAppShare}
            className="h-12 rounded-xl border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 gap-2"
          >
            <MessageCircle size={18} />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={handleEmailShare}
            className="h-12 rounded-xl border-blue-100 dark:border-blue-500/20 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 gap-2"
          >
            <Mail size={18} />
            <span className="hidden sm:inline">Email</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCopy}
            className="h-12 rounded-xl border-gray-100 dark:border-navy-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-800 gap-2"
          >
            {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Link'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
