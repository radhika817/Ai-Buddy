import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion, animate } from 'framer-motion';

/**
 * AI Buddy Motion System
 * 
 * DESIGN.md Section 7 Rules:
 * - Durations: 150-250ms for UI feedback, up to 400ms for entrances, ease-out.
 * - No bounce, no spring overshoot, no zoom, no rotation, no parallax.
 * - Animate only opacity and transform (translate, scale 0.98 for tap).
 * - No gradients, shadows, glow or blur.
 * - Respects prefers-reduced-motion via MotionConfig and useReducedMotion.
 */

export const DURATION = {
  FAST: 0.15,
  DEFAULT: 0.2,
  ENTRANCE: 0.35,
  COUNT_UP: 0.6,
  FLASH: 1.5,
};

export const EASING = {
  EASE_OUT: [0.16, 1, 0.3, 1], // Crisp editorial ease-out
  STANDARD: 'easeOut',
};

// Reusable Framer Motion Variants

export const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.DEFAULT, ease: EASING.EASE_OUT },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.FAST, ease: 'easeOut' },
  },
};

export const fadeRise = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.ENTRANCE, ease: EASING.EASE_OUT },
  },
};

export const fadeRise4px = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.DEFAULT, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.FAST, ease: 'easeOut' },
  },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: DURATION.DEFAULT, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.FAST, ease: 'easeOut' },
  },
};

export const modalOverlay = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: DURATION.DEFAULT, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.FAST, ease: 'easeOut' },
  },
};

export const modalPanel = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.DEFAULT, ease: EASING.EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: { duration: DURATION.FAST, ease: 'easeOut' },
  },
};

export const staggerContainer = (staggerDelay = 0.03) => ({
  animate: {
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

export const staggerChild = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.DEFAULT, ease: 'easeOut' },
  },
};

/**
 * AnimatedNumber Component
 * Counts up once on load over ~600ms using tabular numbers so width never jumps.
 * Displays value immediately if reduced motion is requested.
 */
export function AnimatedNumber({ value = 0, duration = DURATION.COUNT_UP, className = '' }) {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(() => (shouldReduceMotion ? value : 0));

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });

    return () => controls.stop();
  }, [value, duration, shouldReduceMotion]);

  return (
    <span className={`tabular-nums ${className}`}>
      {displayValue}
    </span>
  );
}

/**
 * CheckmarkIcon Component
 * Draws in the check mark stroke over 150ms when checked.
 */
export function AnimatedCheckmark({ checked = false, className = 'w-3.5 h-3.5 text-frame' }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return checked ? (
      <svg viewBox="0 0 14 14" className={className} fill="none">
        <path
          d="M2.5 7.5L5.5 10.5L11.5 3.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : null;
  }

  return (
    <svg viewBox="0 0 14 14" className={className} fill="none">
      <motion.path
        d="M2.5 7.5L5.5 10.5L11.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: checked ? 1 : 0 }}
        transition={{ duration: DURATION.FAST, ease: 'easeOut' }}
      />
    </svg>
  );
}

/**
 * FlatTypingIndicator Component
 * Three flat dots with staggered opacity pulsing (opacity only, no scaling/bouncing).
 */
export function FlatTypingIndicator({ className = '' }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`flex items-center gap-1.5 px-4 py-3 bg-chat-bubble-ai rounded-2xl rounded-tl-sm border border-hairline/60 shadow-none ${className}`}>
      {[0, 0.2, 0.4].map((delay, idx) => (
        <motion.span
          key={idx}
          className="w-1.5 h-1.5 rounded-full bg-ink/70"
          animate={
            shouldReduceMotion
              ? { opacity: 0.7 }
              : { opacity: [0.3, 1, 0.3] }
          }
          transition={
            shouldReduceMotion
              ? {}
              : {
                  repeat: Infinity,
                  duration: 1.0,
                  delay,
                  ease: 'easeInOut',
                }
          }
        />
      ))}
    </div>
  );
}

/**
 * FlatPulsingDot Component
 * Small flat dot for current stepper step (opacity only).
 */
export function FlatPulsingDot({ className = 'w-1.5 h-1.5 rounded-full bg-current' }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      className={className}
      animate={
        shouldReduceMotion
          ? { opacity: 1 }
          : { opacity: [1, 0.25, 1] }
      }
      transition={
        shouldReduceMotion
          ? {}
          : {
              repeat: Infinity,
              duration: 1.2,
              ease: 'easeInOut',
            }
      }
    />
  );
}
