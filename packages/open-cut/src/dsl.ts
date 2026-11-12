/**
 * Code-first authoring surface. A film is a plain object graph: scenes carry
 * seconds, the compiler converts them to frames, and `render` hands the IR to
 * the Rust core through N-API. Timeline is data; the finished file is the
 * compiled artifact.
 */
import { native } from './native.js';
import type { RenderResult } from './native.js';
import type { AudioSpec, Background, CodeTheme, Item, Project } from './types.js';

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

export interface FilmOptions {
    width?: number;
    height?: number;
    fps?: number;
}

interface TimedInput {
    at?: number;
    dur?: number;
    fadeIn?: number;
    fadeOut?: number;
}

export type SceneInput = {
    duration: number;
    background?: Background;
    items?: ItemInput[];
    /** Camera move applied to the whole scene. */
    camera?: CameraInput;
};

/** Camera move in human units: zoom factors, normalized focus, degrees. */
export type CameraInput = {
    zoomFrom?: number;
    zoomTo?: number;
    focusFrom?: [number, number];
    focusTo?: [number, number];
    ease?: Ease;
    rotateTo?: number;
};

/** Item input: same fields as the IR but `at`/`dur`/fades in seconds. */
export type ItemInput = TimedInput & { kind: string } & Record<string, unknown>;

const DEFAULT_FADE = 0.35;

function frames(seconds: number, fps: number): number {
    return Math.round(seconds * fps);
}

function compileItem(item: ItemInput, fps: number, sceneSeconds: number): Item {
    const out: Record<string, unknown> = { ...item };
    out['at'] = frames((item.at ?? 0) as number, fps);
    out['dur'] = Math.max(1, frames((item.dur ?? sceneSeconds) as number, fps));
    out['fadeIn'] = Math.max(1, frames((item.fadeIn ?? DEFAULT_FADE) as number, fps));
    out['fadeOut'] = Math.max(1, frames((item.fadeOut ?? DEFAULT_FADE) as number, fps));
    // A layer's children keep their own (layer-relative) timing, in seconds.
    if (item.kind === 'layer' && Array.isArray(item['items'])) {
        const children = item['items'] as ItemInput[];
        out['items'] = children.map((child) => compileItem(child, fps, sceneSeconds));
    }
    return out as unknown as Item;
}

/** A film: scenes plus the audio bed, compiled to the core IR. */
export class Film {
    readonly width: number;
    readonly height: number;
    readonly fps: number;
    private readonly sceneList: SceneInput[] = [];
    private audioSpec: AudioSpec | null = null;
    private cameraKeys: Array<{ at: number; zoom: number; focus: [number, number]; rotate: number; ease: Ease }> = [];

    constructor(options: FilmOptions = {}) {
        this.width = options.width ?? 1920;
        this.height = options.height ?? 1080;
        this.fps = options.fps ?? 30;
    }

    /** Appends a scene; scenes run back to back in call order. */
    scene(input: SceneInput): this {
        this.sceneList.push(input);
        return this;
    }

    /** Sets the audio bed. `sfx.at`, clip times and narration delay are in
     *  seconds here; the compiler converts them to frames for the IR. Audio
     *  files are decoded by the core, never generated. */
    audio(spec: {
        bgm?: { volume?: number; mood?: string } | null;
        narration?: { wav: string; delay?: number; volume?: number } | null;
        sfx?: Array<{ at: number; kind: 'whoosh' | 'tick' | 'impact'; volume?: number }>;
        clips?: Array<{ src: string; at?: number; dur?: number; offset?: number; volume?: number }>;
    }): this {
        this.audioSpec = {
            bgm: spec.bgm,
            narration: spec.narration
                ? { wav: spec.narration.wav, delayFrames: frames(spec.narration.delay ?? 0, this.fps), volume: spec.narration.volume }
                : null,
            sfx: (spec.sfx ?? []).map((sfx) => ({ ...sfx, at: frames(sfx.at, this.fps) })),
            clips: (spec.clips ?? []).map((clip) => ({
                src: clip.src,
                at: frames(clip.at ?? 0, this.fps),
                dur: clip.dur === undefined ? null : frames(clip.dur, this.fps),
                offsetFrames: frames(clip.offset ?? 0, this.fps),
                volume: clip.volume,
            })),
        };
        return this;
    }

    /** Camera curve for the whole film. Keys are in seconds and are
     *  interpolated continuously, so the result plays as one take. */
    camera(keys: Array<{ at: number; zoom: number; focus?: [number, number]; rotate?: number; ease?: Ease }>): this {
        this.cameraKeys = keys.map((key) => ({
            at: frames(key.at, this.fps),
            zoom: key.zoom,
            focus: key.focus ?? [0.5, 0.5],
            rotate: key.rotate ?? 0,
            ease: key.ease ?? 'in-out-sine',
        }));
        return this;
    }

    /** Total duration in seconds. */
    get seconds(): number {
        return this.sceneList.reduce((sum, scene) => sum + scene.duration, 0);
    }

    /** Compiles to the frame-based scene IR. */
    toProject(): Project {
        let cursor = 0;
        const scenes = this.sceneList.map((scene) => {
            const start = cursor;
            const duration = Math.max(1, frames(scene.duration, this.fps));
            cursor = start + duration;
            return {
                start,
                duration,
                background: scene.background,
                items: (scene.items ?? []).map((item) => compileItem(item, this.fps, scene.duration)),
                camera: scene.camera
                    ? {
                          zoomFrom: scene.camera.zoomFrom ?? 1,
                          zoomTo: scene.camera.zoomTo ?? 1,
                          focusFrom: scene.camera.focusFrom ?? [0.5, 0.5],
                          focusTo: scene.camera.focusTo ?? scene.camera.focusFrom ?? [0.5, 0.5],
                          ease: scene.camera.ease ?? 'in-out-cubic',
                          rotateTo: scene.camera.rotateTo ?? 0,
                      }
                    : null,
            };
        });
        return {
            width: this.width,
            height: this.height,
            fps: this.fps,
            durationFrames: cursor,
            scenes,
            audio: this.audioSpec,
            camera: this.cameraKeys,
        };
    }

    /** Renders the compiled project into `outPath` (MP4). */
    render(outPath: string): RenderResult {
        return native.renderProject({ project: JSON.stringify(this.toProject()), out: outPath });
    }
}

// ---------------------------------------------------------------------------
// Item constructors (all times in seconds, positions normalized 0..1)
// ---------------------------------------------------------------------------

export interface TextOptions {
    at?: number;
    dur?: number;
    content: string;
    sub?: string;
    size: number;
    bold?: boolean;
    color?: string;
    subColor?: string;
    subSize?: number;
    x?: number;
    y: number;
    align?: 'left' | 'center' | 'right';
    fadeIn?: number;
    fadeOut?: number;
    driftY?: number;
    maxWidth?: number;
    lineHeight?: number;
    /** Characters revealed per frame (typewriter effect). */
    typing?: number;
    glow?: string;
    /** Pixels each glyph rises from as it appears. 0 disables the stagger. */
    rise?: number;
    /** Frames between two glyphs entering. */
    stagger?: number;
    /** Reveal rectangle [x, y, w, h] in normalized coords; glyphs paint only inside. */
    clip?: [number, number, number, number];
}

export function text(options: TextOptions): ItemInput {
    return { kind: 'text', color: '#e6eefa', x: 0.5, align: 'center', dur: options.dur ?? 4, ...options } as ItemInput;
}

export interface CodeOptions {
    at?: number;
    dur?: number;
    lines: string[];
    x?: number;
    y: number;
    size?: number;
    theme?: Partial<CodeTheme>;
    fadeIn?: number;
    fadeOut?: number;
    typing?: number;
    lineHeight?: number;
}

export function code(options: CodeOptions): ItemInput {
    return { kind: 'code', x: 0.18, size: 34, dur: options.dur ?? 5, ...options } as ItemInput;
}

export interface CounterOptions {
    at?: number;
    dur?: number;
    from: number;
    to: number;
    y: number;
    x?: number;
    size?: number;
    color?: string;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    ease?: 'linear' | 'in-out-cubic' | 'out-cubic' | 'out-quint' | 'in-out-sine';
    fadeIn?: number;
    fadeOut?: number;
}

export function counter(options: CounterOptions): ItemInput {
    return { kind: 'counter', x: 0.5, size: 150, color: '#f0f6ff', ease: 'out-quint', dur: options.dur ?? 4, ...options } as ItemInput;
}

export interface CardOptions {
    at?: number;
    dur?: number;
    x: number;
    y: number;
    w?: number;
    h?: number;
    title: string;
    body?: string;
    accent?: string;
    panel?: string;
    fadeIn?: number;
    fadeOut?: number;
    driftY?: number;
}

export function card(options: CardOptions): ItemInput {
    return { kind: 'card', w: 0.2, h: 0.16, accent: '#6ea0ff', dur: options.dur ?? 4, ...options } as ItemInput;
}

export interface ShapeOptions {
    at?: number;
    dur?: number;
    shape: 'rect' | 'circle' | 'ring' | 'line';
    x: number;
    y: number;
    w?: number;
    h?: number;
    color?: string;
    radius?: number;
    stroke?: number;
    /** Fraction drawn, for a line that draws itself in. */
    progress?: number;
    blend?: 'normal' | 'add';
    fadeIn?: number;
    fadeOut?: number;
}

export function shape(options: ShapeOptions): ItemInput {
    return { kind: 'shape', w: 0.1, h: 0.01, color: '#6ea0ff', dur: options.dur ?? 3, ...options } as ItemInput;
}

/** Soft diagonal light bands; `alpha` is the peak opacity of each band. */
export function bands(options: {
    at?: number;
    dur?: number;
    count?: number;
    angle?: number;
    speed?: number;
    color?: string;
    alpha?: number;
    thickness?: number;
    fadeIn?: number;
    fadeOut?: number;
}): ItemInput {
    return { kind: 'bands', color: '#8fb4ff', alpha: 0.08, count: 3, angle: -18, speed: 26, thickness: 90, dur: options.dur ?? 4, ...options } as ItemInput;
}

/** Deterministic film grain, refreshed every frame. */
export function grain(options: { at?: number; dur?: number; strength?: number; density?: number; fadeIn?: number; fadeOut?: number } = {}): ItemInput {
    return { kind: 'grain', strength: 0.05, density: 9000, dur: options.dur ?? 4, ...options } as ItemInput;
}

export interface PathOptions {
    at?: number;
    dur?: number;
    /** Control points in normalized frame coordinates. */
    points: Array<[number, number]>;
    /** Treat the points as a smooth curve instead of a polyline. */
    smooth?: boolean;
    closed?: boolean;
    fill?: string;
    /** Stroke color. */
    color?: string;
    stroke?: number;
    /** Fraction of the outline drawn. */
    progress?: number;
    /** Degrees, around the path centroid. */
    rotate?: number;
    scale?: number;
    blend?: 'normal' | 'add';
    fadeIn?: number;
    fadeOut?: number;
}

/**
 * A free path: fill it for shapes and silhouettes, stroke it for lines and
 * charts, and animate `progress` to make it draw itself.
 */
export function path(options: PathOptions): ItemInput {
    return { kind: 'path', color: '#7aa2ff', stroke: 3, progress: 1, scale: 1, rotate: 0, dur: options.dur ?? 4, ...options } as ItemInput;
}

/**
 * A group whose opacity follows the camera zoom. Two layers with overlapping
 * zoom windows cross-fade instead of cutting, which is what lets a single
 * continuous camera move carry the film from one idea to the next.
 */
export interface LayerOptions {
    at?: number;
    dur?: number;
    zoomFrom: number;
    zoomTo: number;
    edge?: number;
    items: ItemInput[];
}

export function layer(options: LayerOptions): ItemInput {
    return { kind: 'layer', edge: 0.12, dur: options.dur ?? 999, ...options } as ItemInput;
}

/** Soft additive light. A disc with a hard edge reads as a sticker, this reads
 *  as light; `radius` is a fraction of the frame width. */
export interface GlowOptions {
    at?: number;
    dur?: number;
    x: number;
    y: number;
    radius: number;
    color?: string;
    intensity?: number;
    fadeIn?: number;
    fadeOut?: number;
}

export function glow(options: GlowOptions): ItemInput {
    return { kind: 'glow', color: '#f2c98a', intensity: 1, dur: options.dur ?? 6, ...options } as ItemInput;
}

export interface FootnoteOptions {
    at?: number;
    dur?: number;
    text: string;
    x?: number;
    y?: number;
    size?: number;
    align?: 'left' | 'center' | 'right';
    color?: string;
    fadeIn?: number;
    fadeOut?: number;
}

/** Source line, bottom-left by default — every claim keeps its citation. */
export function footnote(options: FootnoteOptions): ItemInput {
    return { kind: 'footnote', x: 0.06, y: 0.9, size: 26, align: 'left', color: '#5d6f8c', dur: options.dur ?? 4, ...options } as ItemInput;
}

/** A still image decoded from disk. Position is the box center. */
export function image(options: {
    at?: number;
    dur?: number;
    src: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    fit?: 'contain' | 'cover' | 'stretch';
    opacity?: number;
    radius?: number;
    fadeIn?: number;
    fadeOut?: number;
}): ItemInput {
    return { kind: 'image', x: 0.5, y: 0.5, w: 0.4, h: 0.4, fit: 'contain', opacity: 1, dur: options.dur ?? 4, ...options } as ItemInput;
}

/** A video clip; `srcIn` is the first source frame to show. */
export function video(options: {
    at?: number;
    dur?: number;
    src: string;
    srcIn?: number;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    fit?: 'contain' | 'cover' | 'stretch';
    opacity?: number;
    radius?: number;
    fadeIn?: number;
    fadeOut?: number;
}): ItemInput {
    return { kind: 'video', x: 0.5, y: 0.5, w: 0.4, h: 0.4, fit: 'contain', opacity: 1, dur: options.dur ?? 4, ...options } as ItemInput;
}

/** The only "timeline" a code-first film shows: a global progress bar. */
export function progress(options: { at?: number; dur?: number; track?: string; fill?: string; y?: number } = {}): ItemInput {
    return { kind: 'progress', at: options.at ?? 0, track: '#28344e', fill: '#6ea0ff', ...options } as ItemInput;
}
