import React from 'react';
import { motion } from 'motion/react';
import { Zap, Clock, ArrowRight } from 'lucide-react';
import { LiveOffer } from '@/types';

export function LiveOfferMarquee() {
  return (
    <div className="bg-navy-900 border-y border-gold-500/30 overflow-hidden py-3 relative">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-navy-900 to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-navy-900 to-transparent z-10"></div>
      
      <motion.div 
        animate={{ x: [0, -1000] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="flex whitespace-nowrap gap-12 items-center text-white font-sans font-bold text-sm tracking-tight"
      >
        <span>Welcome to Divyanshi Capital - Your Trusted Financial Partner</span>
        <span>Secure. Fast. Reliable.</span>
        <span>Empowering your financial future.</span>
      </motion.div>
    </div>
  );
}
