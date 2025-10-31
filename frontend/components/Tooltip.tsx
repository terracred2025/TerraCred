'use client';

import { useState, ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="cursor-help"
      >
        {children}
      </div>

      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} w-max max-w-xs`}
          role="tooltip"
        >
          <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm text-foreground">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

interface InfoIconProps {
  tooltip: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoIcon({ tooltip, position = 'top' }: InfoIconProps) {
  return (
    <Tooltip content={tooltip} position={position}>
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground text-xs hover:bg-primary hover:text-primary-foreground transition-colors">
        ?
      </span>
    </Tooltip>
  );
}
