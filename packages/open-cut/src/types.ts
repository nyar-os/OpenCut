/**
 * Scene IR types mirrored from the Rust core (`crates/core/src/scene.rs`).
 * The Rust field names are the source of truth; these shapes must follow.
 */

export type Align = 'left' | 'center' | 'right';
export type Ease =
    | 'linear'
    | 'in-out-cubic'
    | 'out-cubic'
    | 'out-quint'
    | 'in-out-sine'
    | 'out-expo'
    | 'in-expo'
    | 'in-out-quart'
    | 'out-back';
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
          /** Required sources must decode; `false` marks a documented empty slot. */
          required?: boolean;
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
          required?: boolean;
      }
    | { kind: 'progress'; at: number; dur: number; track?: string | null; fill?: string | null; y?: number | null }
    | {
          kind: 'path';
          at: number;
          dur: number;
          points: Array<[number, number]>;
          smooth?: boolean;
          closed?: boolean;
          fill?: string | null;
          color: string;
          stroke?: number | null;
          progress?: number;
          rotate?: number;
          scale?: number;
          blend?: 'normal' | 'add';
          fadeIn?: number;
          fadeOut?: number;
      }
    | {
          kind: 'layer';
          at: number;
          dur: number;
          /** Zoom range in which this group is visible. */
          zoomFrom: number;
          zoomTo: number;
          /** Zoom width of the cross-fade outside the window. */
          edge?: number;
          items: Item[];
      }
    | {
          kind: 'glow';
          at: number;
          dur: number;
          x: number;
          y: number;
          /** Radius as a fraction of the frame width. */
          radius: number;
          color?: string;
          intensity?: number;
          fadeIn?: number;
          fadeOut?: number;
      };

export interface BgmSpec {
    volume?: number;
    mood?: string;
}

export interface NarrationSpec {
    wav: string;
    delayFrames?: number;
    volume?: number;
}

/** The eight synthesized effect families of the shared sound core. */
export type SfxFamily = 'whoosh' | 'impact' | 'riser' | 'tick' | 'glitch' | 'sub' | 'ambience' | 'sparkle';

/**
 * One synthesized effect placed at `at` frames. Name either `kind` (a family)
 * or `preset` (a catalogue name) — never both — and any optional parameter
 * overrides the resolved base spec.
 */
export interface SfxSpec {
    at: number;
    volume?: number;
    kind?: SfxFamily;
    preset?: string;
    duration?: number;
    pitch?: number;
    brightness?: number;
    intensity?: number;
    pan?: number;
    seed?: number;
}

/** The five contracted vowels of the singing voice. */
export type Vowel = 'a' | 'e' | 'i' | 'o' | 'u';

/** Syllable-onset consonant classes (fricative, plosive, nasal, glide). */
export type Onset = 's' | 't' | 'n' | 'r' | 'w' | 'y' | 'f';

export interface Syllable {
    onset?: Onset;
    vowel: Vowel;
    /** Fundamental frequency in Hz, 40..1200. */
    pitch: number;
    /** Duration in beats at the song tempo, 0.05..8. */
    beats: number;
}

/** The `media.voice` song contract, unchanged by the film IR. */
export interface VoiceSpec {
    syllables: Syllable[];
    /** Tempo in beats per minute, 20..400. */
    tempoBpm?: number;
    vibrato?: { rateHz: number; depth: number; delayS: number };
    breath?: number;
    volume?: number;
    seed?: number;
}

/** One synthesized song placed at `at` frames. */
export interface VoicePlacementSpec {
    at: number;
    volume?: number;
    song: VoiceSpec;
}

/** Every playable instrument of the shared synthesis core. */
export type InstrumentName =
    | 'kick'
    | 'snare'
    | 'clap'
    | 'hat-closed'
    | 'hat-open'
    | 'tom'
    | 'rim'
    | 'shaker'
    | 'crash'
    | 'bass'
    | 'pluck'
    | 'pad'
    | 'lead'
    | 'bell'
    | 'marimba'
    | 'keys'
    | 'strings';

/** One instrument hit placed at `at` frames (`note` is a MIDI number). */
export interface NoteSpec {
    at: number;
    instrument: InstrumentName;
    note?: number;
    duration?: number;
    velocity?: number;
    tone?: number;
    decay?: number;
    pan?: number;
    seed?: number;
}

/** One custom groove track: step velocities, 0 is a rest. */
export interface PatternTrackSpec {
    instrument: InstrumentName;
    note?: number;
    steps: number[];
    tone?: number;
    decay?: number;
    pan?: number;
}

/** One drum groove: a shipped preset or custom tracks. */
export interface PatternSpec {
    at: number;
    preset?: string;
    bpm?: number;
    bars?: number;
    tracks?: PatternTrackSpec[];
    volume?: number;
}

/** Note input in the authoring surface (`at` in seconds). */
export type NoteInput = NoteSpec;
/** Groove input in the authoring surface (`at` in seconds). */
export type PatternInput = PatternSpec;
/** Effect input in the authoring surface (`at` in seconds). */
export type SfxInput = SfxSpec;
/** Voice input in the authoring surface (`at` in seconds). */
export type VoiceInput = VoicePlacementSpec;

export interface AudioClipSpec {
    src: string;
    at: number;
    dur?: number | null;
    offsetFrames?: number;
    volume?: number;
    /** Imported audio must decode unless the author declares it optional. */
    required?: boolean;
}

export interface AudioSpec {
    bgm?: BgmSpec | null;
    narration?: NarrationSpec | null;
    sfx?: SfxSpec[];
    /** Synthesized songs mixed into the bed. */
    voice?: VoicePlacementSpec[];
    /** One-shot instruments mixed into the bed. */
    notes?: NoteSpec[];
    /** Drum grooves mixed into the bed. */
    patterns?: PatternSpec[];
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

/** A key on the film-wide camera curve, positioned by frame. */
export interface CameraKey {
    at: number;
    zoom: number;
    focus?: [number, number];
    rotate?: number;
    ease?: Ease;
}

/** Film-level visual controls. An omitted effect is off, not a house default. */
export interface PostSpec {
    /** Corner darkening 0..=1; omit for none. */
    vignette?: number;
}

/** Explicit font files, one per face. */
export interface FontsSpec {
    regular: string;
    bold: string;
    mono: string;
}

export interface Project {
    width: number;
    height: number;
    fps: number;
    durationFrames: number;
    scenes: Scene[];
    audio?: AudioSpec | null;
    /** One continuous camera move for the whole film. */
    camera?: CameraKey[];
    post?: PostSpec;
    fonts?: FontsSpec | null;
}
