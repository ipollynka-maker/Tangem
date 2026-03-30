// src/animations/types.ts

export type EasingHint =
  | 'spring_overshoot'
  | 'bounce'
  | 'ease_in_out'
  | 'ease_in'
  | 'ease_out'
  | 'linear'
  | 'custom';

export type AnimationProperty =
  | 'translateX' | 'translateY' | 'translateZ'
  | 'scale' | 'scaleX' | 'scaleY'
  | 'rotate' | 'rotateX' | 'rotateY' | 'rotateZ'
  | 'opacity';

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
}

export interface AnimationLayer {
  id: string;
  property: AnimationProperty;
  from: number;
  to: number;
  to_final?: number;
  start_at?: number;          // delay in seconds before this layer animates
  easing: EasingHint;
  spring?: SpringConfig;
  render_compatible: boolean; // false = Rive/GSAP/CSS-only, skip Remotion render
  lottie_compatible: boolean;
}

export interface AnimationSpec {
  name: string;
  duration: number;           // total duration in seconds
  fps: number;
  lottie_compatible: boolean; // true if ALL layers are lottie_compatible
  assets: Record<string, string>; // layerId → path relative to public/
  layers: AnimationLayer[];
}
