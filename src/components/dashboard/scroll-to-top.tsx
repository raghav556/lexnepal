"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScrollToTopProps {
  /** Target element ref or selector. If omitted, uses parent or window. */
  containerRef?: React.RefObject<HTMLElement | null>;
  threshold?: number;
  className?: string;
}

/**
 * Executive floating "Scroll to Top" navigation assistant.
 * Renders with a progress ring indicating scroll depth and provides one-click
 * smooth navigation back to the top of the canvas.
 */
export function ScrollToTop({ containerRef, threshold = 240, className }: ScrollToTopProps) {
  const [visible, setVisible] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef?.current ?? window;

    const handleScroll = () => {
      let scrollTop = 0;
      let scrollHeight = 0;
      let clientHeight = 0;

      if (containerRef?.current) {
        scrollTop = containerRef.current.scrollTop;
        scrollHeight = containerRef.current.scrollHeight;
        clientHeight = containerRef.current.clientHeight;
      } else {
        scrollTop = window.scrollY || document.documentElement.scrollTop;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = window.innerHeight;
      }

      setVisible(scrollTop > threshold);

      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        setProgress(Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)));
      } else {
        setProgress(0);
      }
    };

    if (containerRef?.current) {
      const container = containerRef.current;
      container.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    } else {
      window.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [containerRef, threshold]);

  const scrollToTop = () => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!visible) return null;

  // SVG circular ring calculation (size 32, radius 13, circumference ~81.68)
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top of page"
      className={cn(
        "fixed bottom-14 right-6 z-40 flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/90 py-1.5 pl-2.5 pr-3 text-xs font-semibold text-slate-300 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-blue-500/50 hover:bg-slate-800 hover:text-white hover:shadow-[0_0_16px_rgba(72,127,255,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 animate-in fade-in slide-in-from-bottom-2",
        className,
      )}
    >
      <div className="relative flex size-6 items-center justify-center">
        <svg className="size-6 -rotate-90" aria-hidden>
          <circle
            cx="12"
            cy="12"
            r={radius}
            className="stroke-slate-700"
            strokeWidth="2.5"
            fill="transparent"
          />
          <circle
            cx="12"
            cy="12"
            r={radius}
            className="stroke-[#487FFF] transition-all duration-150"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <ArrowUp className="absolute size-3 text-[#487FFF]" aria-hidden />
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-300">Top</span>
    </button>
  );
}
