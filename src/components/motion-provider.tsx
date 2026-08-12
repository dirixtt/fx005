"use client";

import { MotionConfig } from "motion/react";

/**
 * Honours the OS "reduce motion" setting for every `motion` component in the app.
 *
 * `reducedMotion="user"` keeps opacity and colour animations — which aid
 * comprehension — while dropping transform and layout animation, which is the
 * part that triggers vestibular discomfort. That matters here more than on a
 * typical marketing page: the catalogue slides in every single product card, so
 * one scroll through 24 items is 24 separate movements.
 *
 * Wrapping at the root rather than per-component means a new animation added
 * later is covered by default instead of having to remember.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
