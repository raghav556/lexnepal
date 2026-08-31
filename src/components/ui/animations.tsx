import React, { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

// The premium easing curve for "quiet luxury" feeling
export const PREMIUM_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// 1. RevealText Effect (Slides up from behind a mask)
export function RevealText({
  children,
  delay = 0,
  className,
  as: Component = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: any;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <Component ref={ref} className={cn("overflow-hidden block", className)}>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={isInView ? { y: 0, opacity: 1 } : { y: "100%", opacity: 0 }}
        transition={{ duration: 1, ease: PREMIUM_EASE, delay }}
      >
        {children}
      </motion.div>
    </Component>
  );
}

// 2. FadeInUp standard component
export function FadeInUp({
  children,
  delay = 0,
  className,
  yOffset = 30,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  yOffset?: number;
}) {
  const ref = useRef(null);
  // Use a generous root margin so content inside nested scroll panes (admin/staff shells)
  // becomes visible instead of staying stuck at opacity 0.
  const isInView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: yOffset }}
      transition={{ duration: 0.8, ease: PREMIUM_EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 3. HoverGlowCard (Mouse tracking subtle glow effect)
export function HoverGlowCard({
  children,
  className,
  glowColor = "rgba(107, 33, 168, 0.15)", // Default subtle primary/accent glow
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("relative overflow-hidden transition-all duration-300 group", className)}
    >
      {/* The Glow */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-0 group-hover:opacity-100"
        animate={{ opacity: isHovered ? 1 : 0 }}
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}, transparent 40%)`,
        }}
      />

      {/* The Content - Needs z-index to sit above the glow */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
