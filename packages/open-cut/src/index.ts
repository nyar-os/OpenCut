/**
 * `@wae/open-cut` — code-first video editing.
 *
 * The public authoring surface is the DSL; the native binding is re-exported
 * for hosts that want the raw IR path.
 */
export { Film, bands, card, code, counter, footnote, glow, grain, image, layer, path, progress, shape, text, video } from './dsl.js';
export type {
    CameraInput,
    CardOptions,
    CodeOptions,
    CounterOptions,
    FilmOptions,
    FootnoteOptions,
    GlowOptions,
    ItemInput,
    LayerOptions,
    PathOptions,
    SceneInput,
    ShapeOptions,
    TextOptions,
} from './dsl.js';
export type { BuildInfo, RenderOptions, RenderResult } from './native.js';
export { native } from './native.js';
export type * from './types.js';

import { native } from './native.js';
import type { BuildInfo } from './native.js';

/** Native library version reported by the Rust core binding. */
export function nativeVersion(): string {
    return native.version();
}

/** Source revision and profile this native binary was built from. */
export function nativeBuild(): BuildInfo {
    return native.build();
}
