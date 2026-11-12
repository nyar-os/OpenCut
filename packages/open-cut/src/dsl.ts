/**
 * Code-first authoring surface. A film is a plain object graph: scenes carry
 * seconds, the compiler converts them to frames, and `render` hands the IR to
 * the Rust core through N-API. Timeline is data; the finished file is the
 * compiled artifact.
 */
import { native } from './native.js';
import type { RenderResult } from './native.js';
import type { AudioSpec, Background, CodeTheme, Item, Project } from './types.js';

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
    return out as unknown as Item;
}

/** A film: scenes plus the audio bed, compiled to the core IR. */
export class Film {
    readonly width: number;
    readonly height: number;
    readonly fps: number;
    private readonly sceneList: SceneInput[] = [];
    private audioSpec: AudioSpec | null = null;

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

    /** Sets the audio bed. Narration is a reserved slot: point it at a PCM WAV. */
    audio(spec: AudioSpec): this {
        this.audioSpec = spec;
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
            };
        });
        return {
            width: this.width,
            height: this.height,
            fps: this.fps,
            durationFrames: cursor,
            scenes,
            audio: this.audioSpec,
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
    fadeIn?: number;
    fadeOut?: number;
}

export function shape(options: ShapeOptions): ItemInput {
    return { kind: 'shape', w: 0.1, h: 0.01, color: '#6ea0ff', dur: options.dur ?? 3, ...options } as ItemInput;
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

/** The only "timeline" a code-first film shows: a global progress bar. */
export function progress(options: { at?: number; dur?: number; track?: string; fill?: string; y?: number } = {}): ItemInput {
    return { kind: 'progress', at: options.at ?? 0, track: '#28344e', fill: '#6ea0ff', ...options } as ItemInput;
}
