/**
 * `@wae/open-cut` — code-first video editing.
 *
 * The public authoring surface is the DSL; the native binding is re-exported
 * for hosts that want the raw IR path.
 */
export { Film, card, code, counter, footnote, progress, shape, text } from './dsl.js';
export type { CardOptions, CodeOptions, CounterOptions, FilmOptions, FootnoteOptions, ItemInput, SceneInput, ShapeOptions, TextOptions } from './dsl.js';
export type { RenderResult } from './native.js';
export { native } from './native.js';
export type * from './types.js';

import { native } from './native.js';

/** Native library version reported by the Rust core binding. */
export function nativeVersion(): string {
    return native.version();
}
