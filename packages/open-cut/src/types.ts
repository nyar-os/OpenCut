/**
 * Scene IR types mirrored from the Rust core (`crates/core/src/scene.rs`).
 * The Rust field names are the source of truth; these shapes must follow.
 */

export type Align = 'left' | 'center' | 'right';
export type Ease = 'linear' | 'in-out-cubic' | 'out-cubic' | 'out-quint' | 'in-out-sine';
export type ShapeKind = 'rect' | 'circle' | 'ring' | 'line';
/** How imported media is mapped into its layout box. */
export type Fit = 'contain' | 'cover' | 'stretch';

export type Background =
    | { kind: 'solid'; color: string }
    | { kind: 'v-gradient'; colors: string[] }
    | { kind: 'radial'; center: string; edge: string }
    | { kind: 'starfield'; base: string[]; stars?: number; tint?: string; drift?: number; twinkle?: number };

export interface CodeTheme {
    panel?: string | null;
    plain?: string;
    keyword?: string;
    string?: string;
    comment?: string;
    number?: string;
    function?: string;
}

export type Item =
    | {
          kind: 'text';
          at: number;
          dur: number;
          content: string;
          sub?: string | null;
          size: number;
          bold?: boolean;
          color: string;
          subColor?: string | null;
          subSize?: number | null;
          x: number;
          y: number;
          align?: Align;
          fadeIn?: number;
          fadeOut?: number;
          driftY?: number;
          maxWidth?: number | null;
          lineHeight?: number | null;
          typing?: number | null;
          glow?: string | null;
      }
    | {
          kind: 'code';
          at: number;
          dur: number;
          lines: string[];
          x: number;
          y: number;
          size: number;
          theme?: Partial<CodeTheme>;
          fadeIn?: number;
          fadeOut?: number;
          typing?: number | null;
          lineHeight?: number | null;
      }
    | {
          kind: 'counter';
          at: number;
          dur: number;
          from: number;
          to: number;
          x: number;
          y: number;
          size: number;
          color: string;
          prefix?: string | null;
          suffix?: string | null;
          decimals?: number;
          ease?: Ease;
          fadeIn?: number;
          fadeOut?: number;
      }
    | {
          kind: 'card';
          at: number;
          dur: number;
          x: number;
          y: number;
          w: number;
          h: number;
          title: string;
          body?: string | null;
          accent?: string | null;
          panel?: string | null;
          fadeIn?: number;
          fadeOut?: number;
          driftY?: number;
      }
    | {
          kind: 'shape';
          at: number;
          dur: number;
          shape: ShapeKind;
          x: number;
          y: number;
          w: number;
          h: number;
          color: string;
          radius?: number;
          stroke?: number | null;
          fadeIn?: number;
          fadeOut?: number;
      }
    | { kind: 'footnote'; at: number; dur: number; text: string; size?: number; x: number; y: number; align?: Align; color?: string; fadeIn?: number; fadeOut?: number }
    | {
          kind: 'image';
          at: number;
          dur: number;
          src: string;
          x: number;
          y: number;
          w: number;
          h: number;
          fit?: Fit;
          opacity?: number;
          radius?: number;
          fadeIn?: number;
          fadeOut?: number;
      }
    | {
          kind: 'video';
          at: number;
          dur: number;
          src: string;
          srcIn?: number;
          x: number;
          y: number;
          w: number;
          h: number;
          fit?: Fit;
          opacity?: number;
          radius?: number;
          fadeIn?: number;
          fadeOut?: number;
      }
    | { kind: 'progress'; at: number; dur: number; track?: string | null; fill?: string | null; y?: number | null };

export interface BgmSpec {
    volume?: number;
    mood?: string;
}

export interface NarrationSpec {
    wav: string;
    delayFrames?: number;
    volume?: number;
}

export interface SfxSpec {
    at: number;
    kind: 'whoosh' | 'tick' | 'impact';
    volume?: number;
}

export interface AudioClipSpec {
    src: string;
    at: number;
    dur?: number | null;
    offsetFrames?: number;
    volume?: number;
}

export interface AudioSpec {
    bgm?: BgmSpec | null;
    narration?: NarrationSpec | null;
    sfx?: SfxSpec[];
    /** Imported audio placed on the timeline. */
    clips?: AudioClipSpec[];
}

export interface Scene {
    start: number;
    duration: number;
    background?: Background;
    items?: Item[];
    camera?: Camera | null;
}

export interface Camera {
    zoomFrom?: number;
    zoomTo?: number;
    focusFrom?: [number, number];
    focusTo?: [number, number];
    ease?: Ease;
    rotateTo?: number;
}

export interface Project {
    width: number;
    height: number;
    fps: number;
    durationFrames: number;
    scenes: Scene[];
    audio?: AudioSpec | null;
}
