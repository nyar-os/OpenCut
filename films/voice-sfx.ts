/**
 * OpenCut 声音样张 ——「两种合成」(8 秒)
 *
 * 这条片子不吃任何外部音频文件：音效来自共享核心的 preset 目录，
 * 歌声来自 `media.voice` 的音节合同，两者都由 core 在渲染时合成。
 *
 * 0.0–3.0  夜、一个发光的「声」字，低频 impact 落地
 * 3.0–5.5  音效段落：金属 whoosh 掠过，字幕标出 preset 名
 * 5.5–8.0  歌声段落：五个音节唱出 a-o-e-i-u，riser 收尾
 *
 * 运行:node --experimental-strip-types films/voice-sfx.ts voice-sfx.mp4
 */
import { pathToFileURL } from 'node:url';
import { Film, bands, glow, grain, shape, text } from '../packages/open-cut/dist/index.js';

const INK = '#e9f0fb';
const ACCENT = '#7aa2ff';
const HOT = '#e8b86d';
const VOICE = '#6fd6a4';

const film = new Film({ width: 1280, height: 720, fps: 30 });

// 1 — 一个发光的字。
film.scene({
    duration: 3.0,
    background: { kind: 'v-gradient', colors: ['#070c18', '#101a33', '#04060d'] },
    camera: { zoomFrom: 1.0, zoomTo: 1.06, focusFrom: [0.5, 0.5], focusTo: [0.5, 0.48], ease: 'in-out-cubic' },
    items: [
        glow({ at: 0, dur: 3.0, x: 0.5, y: 0.46, radius: 0.42, color: '#2b4d95', intensity: 0.5 }),
        text({ at: 0.1, y: 0.4, size: 128, bold: true, color: INK, content: '声', rise: 26, stagger: 2, dur: 2.6 }),
        text({ at: 1.2, y: 0.62, size: 30, color: '#8fa3c8', content: 'impact-deep · 合成落地', dur: 1.6 }),
        grain({ strength: 0.07, density: 12000 }),
    ],
});

// 2 — 音效掠过。
film.scene({
    duration: 2.5,
    background: { kind: 'solid', color: '#05070f' },
    camera: { zoomFrom: 1.04, zoomTo: 1.0, ease: 'out-cubic' },
    items: [
        bands({ at: 0, dur: 2.5, count: 3, angle: -12, speed: 52, color: ACCENT, alpha: 0.2, thickness: 260 }),
        shape({ at: 0.1, dur: 2.2, shape: 'ring', x: 0.5, y: 0.42, w: 0.22, h: 0.22, color: ACCENT, stroke: 3 }),
        text({ at: 0.2, y: 0.3, size: 54, bold: true, color: INK, content: '音效', dur: 2.0 }),
        text({ at: 0.5, y: 0.6, size: 28, color: '#8fa3c8', content: 'whoosh-metal · 八族 + preset', dur: 1.8 }),
        grain({ strength: 0.08, density: 14000 }),
    ],
});

// 3 — 歌声。
film.scene({
    duration: 2.5,
    background: { kind: 'v-gradient', colors: ['#070c18', '#132b2a', '#04060d'] },
    camera: { zoomFrom: 1.0, zoomTo: 1.05, focusFrom: [0.5, 0.5], focusTo: [0.5, 0.46], ease: 'in-out-cubic' },
    items: [
        glow({ at: 0, dur: 2.5, x: 0.5, y: 0.46, radius: 0.38, color: '#2f6b52', intensity: 0.45 }),
        text({ at: 0.1, y: 0.34, size: 62, bold: true, color: INK, content: '歌声', dur: 2.2 }),
        text({ at: 0.5, y: 0.58, size: 30, color: VOICE, content: 'a · o · e · i · u', dur: 1.8 }),
        text({ at: 0.9, y: 0.7, size: 24, color: '#6f8aa8', content: 'riser-tension · 收尾', dur: 1.4 }),
        grain({ strength: 0.07, density: 12000 }),
    ],
});

film.audio({
    bgm: { volume: 0.05 },
    sfx: [
        { at: 0.0, preset: 'impact-deep', volume: 0.5 },
        { at: 0.6, kind: 'tick', volume: 0.25 },
        { at: 3.0, preset: 'whoosh-metal', volume: 0.45 },
        { at: 4.2, kind: 'tick', volume: 0.3, pitch: 1.4 },
        { at: 5.4, preset: 'riser-tension', volume: 0.28, duration: 2.4 },
        { at: 7.6, preset: 'impact-snap', volume: 0.4 },
    ],
    voice: [
        {
            at: 2.6,
            volume: 0.9,
            song: {
                tempoBpm: 100,
                breath: 0.1,
                vibrato: { rateHz: 5.2, depth: 0.018, delayS: 0.14 },
                syllables: [
                    { onset: 'r', vowel: 'a', pitch: 392.0, beats: 1.0 },
                    { vowel: 'o', pitch: 440.0, beats: 1.0 },
                    { onset: 'n', vowel: 'e', pitch: 523.25, beats: 1.0 },
                    { vowel: 'i', pitch: 440.0, beats: 0.5 },
                    { onset: 's', vowel: 'u', pitch: 392.0, beats: 1.5 },
                ],
            },
        },
    ],
});

export default film;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const stats = film.render(process.argv[2] ?? 'voice-sfx.mp4');
    console.log(`rendered ${stats.frames} frames (${stats.seconds.toFixed(1)}s) -> ${stats.out}`);
    console.log(`backend: ${stats.backend} · audio: ${stats.audio}`);
}
