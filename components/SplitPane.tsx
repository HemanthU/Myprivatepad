"use client";

import React, { useState, useEffect, useRef } from "react";

interface SplitPaneProps {
  children: [React.ReactNode, React.ReactNode];
  defaultRatio?: number;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export default function SplitPane({ children, defaultRatio = 0.5, direction = 'horizontal', className = "" }: SplitPaneProps) {
  const [ratio, setRatio] = useState(defaultRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      if (direction === 'horizontal') {
        const newRatio = (e.clientX - rect.left) / rect.width;
        setRatio(Math.min(Math.max(newRatio, 0.2), 0.8));
      } else {
        const newRatio = (e.clientY - rect.top) / rect.height;
        setRatio(Math.min(Math.max(newRatio, 0.2), 0.8));
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [direction]);

  const handleMouseDown = () => {
    isDragging.current = true;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const isHorizontal = direction === 'horizontal';

  return (
    <div ref={containerRef} className={`flex w-full h-full ${isHorizontal ? 'flex-row' : 'flex-col'} ${className}`}>
      <div style={{ [isHorizontal ? 'width' : 'height']: `${ratio * 100}%` }} className="relative overflow-hidden">
        {children[0]}
      </div>
      
      <div 
        onMouseDown={handleMouseDown}
        className={`bg-border/50 hover:bg-accent-bg/50 transition-colors flex items-center justify-center
          ${isHorizontal ? 'w-1.5 cursor-col-resize flex-col' : 'h-1.5 cursor-row-resize flex-row'}
        `}
      >
        <div className={`bg-border rounded-full ${isHorizontal ? 'w-0.5 h-8' : 'w-8 h-0.5'}`} />
      </div>

      <div style={{ [isHorizontal ? 'width' : 'height']: `${(1 - ratio) * 100}%` }} className="relative overflow-hidden">
        {children[1]}
      </div>
    </div>
  );
}
