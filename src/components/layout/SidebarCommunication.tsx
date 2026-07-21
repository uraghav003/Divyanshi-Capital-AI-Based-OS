import React from 'react';
import { Mail, MessageCircle, Send, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SidebarCommunication() {
  const links = [
    { name: 'Mail', icon: Mail, url: 'mailto:upendra.raghav@divyanshicapital.com', color: 'hover:text-blue-400 hover:bg-blue-400/10' },
    { name: 'WhatsApp', icon: MessageCircle, url: 'https://wa.me/917838074351', color: 'hover:text-emerald-400 hover:bg-emerald-400/10' },
    { name: 'Telegram', icon: Send, url: 'https://t.me/divyanshicapital', color: 'hover:text-sky-400 hover:bg-sky-400/10' },
    { name: 'Teams/Meet', icon: Video, url: 'https://meet.google.com/', color: 'hover:text-purple-400 hover:bg-purple-400/10' },
  ];

  return (
    <div className="bg-white/5 rounded-2xl p-3 mb-4">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-2 px-1">Quick Connect</p>
      <div className="grid grid-cols-4 gap-1">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={link.name}
            className={cn("flex items-center justify-center p-2 rounded-xl text-gray-400 transition-colors", link.color)}
          >
            <link.icon size={16} />
          </a>
        ))}
      </div>
    </div>
  );
}
