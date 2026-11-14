/**
 * Theme tokens: one project color card, a locked accent and a scene override.
 *
 * Every color below is a semantic role, so switching the card changes the whole
 * film without touching a single item. The second scene overrides the unlocked
 * `ink` role; `accent` is locked and cannot be overridden.
 */
import { pathToFileURL } from 'node:url';
import { Film, colorToken, text } from '../packages/open-cut/dist/index.js';

const ink = colorToken('ink');
const accent = colorToken('accent');
const panel = colorToken('panel');

const film = new Film({ width: 1280, height: 720, fps: 30 }).design({
    colors: [
        { role: 'ink', value: '#e9f0fb' },
        { role: 'panel', value: '#0b1226' },
        { role: 'accent', value: '#7aa2ff', locked: true },
    ],
});

film.scene({
    id: 'card',
    duration: 2.5,
    background: { kind: 'v-gradient', colors: [panel, accent] },
    items: [
        text({ at: 0, dur: 2.5, content: 'theme tokens', color: ink, size: 64, x: 0.5, y: 0.42, align: 'center' }),
        text({ at: 0.2, dur: 2.3, content: 'accent is locked', color: accent, size: 28, x: 0.5, y: 0.56, align: 'center' }),
    ],
});

film.scene({
    id: 'scene-override',
    duration: 2.5,
    design: { colors: [{ role: 'ink', value: '#ffd9a0' }] },
    background: { kind: 'solid', color: panel },
    items: [
        text({ at: 0, dur: 2.5, content: 'ink overridden per scene', color: ink, size: 48, x: 0.5, y: 0.5, align: 'center' }),
    ],
});

export default film;

// Render only when this file is executed directly: importing it from the CLI
// must not start an export with the CLI's own arguments.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const stats = film.render(process.argv[2] ?? 'design-tokens.mp4');
    console.log(`rendered ${stats.frames} frames (${stats.seconds.toFixed(1)}s) -> ${stats.out}`);
    console.log(`backend: ${stats.backend} · audio: ${stats.audio}`);
}
