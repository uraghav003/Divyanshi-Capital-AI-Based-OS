import React from 'react';
import { cn } from '@/lib/utils';

export function DivyanshiLogo({ className, showText = false, dark = false }: { className?: string, showText?: boolean, dark?: boolean }) {
  // Using the official logo from Divyanshi Capital's website
  const logoUrl = "https://www.divyanshicapital.com/wp-content/uploads/2021/09/logo1.png";
  
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <img 
        src={logoUrl} 
        alt="Divyanshi Capital" 
        referrerPolicy="no-referrer"
        className={cn(
          "w-full h-auto object-contain",
          dark && "brightness-0 invert opacity-90" // Makes the image white in dark mode if needed
        )}
      />
      
      {showText && (
        <div className="text-center mt-2 select-none">
          <p className={cn(
            "font-sans font-bold text-[9px] tracking-[0.18em] uppercase mt-1 opacity-90 block",
            dark ? "text-amber-400" : "text-[#0c4d8e]"
          )}>
            India's Largest Loan Facilitator
          </p>
        </div>
      )}
    </div>
  );
}
