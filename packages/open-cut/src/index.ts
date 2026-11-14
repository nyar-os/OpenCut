/**
 * `@wae/open-cut` — code-first video editing.
 *
 * The public authoring surface is the DSL; the native binding is re-exported
 * for hosts that want the raw IR path.
 */
export { Film, anim, bands, card, code, colorToken, counter, footnote, glow, grain, image, instance, layer, path, progress, shape, text, video } from './dsl.js';
export type {
    CameraInput,
    CardOptions,
    CodeOptions,
    ComponentInput,
    CounterOptions,
    FilmOptions,
    FootnoteOptions,
    GlowOptions,
    ItemInput,
    LayerOptions,
    NodeOptions,
    PathOptions,
    SceneInput,
    ShapeOptions,
    TextOptions,
} from './dsl.js';
export type { AssetFingerprint, AudioLevel, BuildInfo, PreviewResult, RenderOptions, RenderResult, SceneSpan } from './native.js';
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
