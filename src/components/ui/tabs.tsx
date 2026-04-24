"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface UITab {
  id: string;
  label: string;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: UITab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, tabs, activeTab, onTabChange, ...props }, ref) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [internalActive, setInternalActive] = useState(0);
    const [hoverStyle, setHoverStyle] = useState({});
    const [activeStyle, setActiveStyle] = useState({ left: "0px", width: "0px" });
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const activeIndex = activeTab
      ? Math.max(
          0,
          tabs.findIndex((tab) => tab.id === activeTab),
        )
      : internalActive;

    useEffect(() => {
      if (hoveredIndex === null) return;
      const hoveredElement = tabRefs.current[hoveredIndex];
      if (!hoveredElement) return;
      const { offsetLeft, offsetWidth } = hoveredElement;
      setHoverStyle({ left: `${offsetLeft}px`, width: `${offsetWidth}px` });
    }, [hoveredIndex]);

    useEffect(() => {
      const activeElement = tabRefs.current[activeIndex];
      if (!activeElement) return;
      const { offsetLeft, offsetWidth } = activeElement;
      setActiveStyle({ left: `${offsetLeft}px`, width: `${offsetWidth}px` });
    }, [activeIndex, tabs.length]);

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        <div className="relative rounded-2xl border border-[#FFC193] bg-[#FFEDCE]/60 p-1.5">
          <div
            className="absolute top-1.5 h-[34px] rounded-xl bg-white/80 transition-all duration-300 ease-out"
            style={{
              ...hoverStyle,
              opacity: hoveredIndex !== null ? 1 : 0,
            }}
          />
          <div
            className="absolute bottom-1.5 h-[2px] bg-[#FF3737] transition-all duration-300 ease-out"
            style={activeStyle}
          />

          <div className="relative flex items-center gap-1.5">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                className={cn(
                  "h-[34px] rounded-xl px-3 text-xs font-semibold uppercase tracking-[0.06em] transition-colors",
                  index === activeIndex ? "text-[#171717]" : "text-[#6f6f6f]",
                )}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => {
                  setInternalActive(index);
                  onTabChange?.(tab.id);
                }}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  },
);
Tabs.displayName = "Tabs";

export { Tabs };
