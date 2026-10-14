"use client";

import { useRef, useEffect, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
  once?: boolean;
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  duration = 0.6,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const directionMap = {
    up: "translateY(24px)",
    down: "translateY(-24px)",
    left: "translateX(24px)",
    right: "translateX(-24px)",
    none: "translateY(0)",
  };

    let animation: Animation | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        animation?.cancel();
        animation = el.animate(
          [{ opacity: 0, transform: directionMap[direction] }, { opacity: 1, transform: "none" }],
          { duration: duration * 1000, delay: delay * 1000, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" },
        );
        if (once) observer.unobserve(el);
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => { observer.disconnect(); animation?.cancel(); };
  }, [delay, direction, duration, once]);

  return <div ref={ref} className={className}>{children}</div>;
}
export function StaggerReveal({
  children,
  className = "",
  staggerDelay = 0.1,
  baseDelay = 0,
  direction = "up",
  duration = 0.6,
}: {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
  baseDelay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <Reveal
          key={i}
          delay={baseDelay + i * staggerDelay}
          direction={direction}
          duration={duration}
        >
          {child}
        </Reveal>
      ))}
    </div>
  );
}
