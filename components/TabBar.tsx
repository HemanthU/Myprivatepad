"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export default function TabBar({ currentSlug }: { currentSlug: string }) {
  const [tabs, setTabs] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('pad-tabs') || '[]');
      if (!stored.includes(currentSlug) && currentSlug !== 'admin') {
         stored.push(currentSlug);
         localStorage.setItem('pad-tabs', JSON.stringify(stored));
      }
      setTabs(stored);
    } catch {
      setTabs([currentSlug]);
    }
  }, [currentSlug]);

  const removeTab = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t !== slug);
    localStorage.setItem('pad-tabs', JSON.stringify(newTabs));
    setTabs(newTabs);
    
    if (currentSlug === slug) {
       if (newTabs.length > 0) {
         router.push('/' + newTabs[newTabs.length - 1]);
       } else {
         router.push('/');
       }
    }
  };

  if (tabs.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-0 border-b border-border w-full no-scrollbar px-4 sm:px-8 max-w-[1400px] mx-auto mt-2">
      {tabs.map(t => (
         <div 
           key={t} 
           onClick={() => router.push('/' + t)} 
           className={`px-4 py-2 rounded-t-xl flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap text-sm border-t border-l border-r -mb-[1px] ${t === currentSlug ? 'glass-frosted font-bold text-white border-white/40 shadow-sm' : 'glass-clear text-gray-400 hover:text-white border-white/10'}`}
         >
           #{t}
           <div 
             className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
             onClick={(e) => removeTab(e, t)}
           >
             <X size={14} />
           </div>
         </div>
      ))}
    </div>
  );
}
