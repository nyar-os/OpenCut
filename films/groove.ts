/**
 * OpenCut 节奏样张 ——「八小节」(8 秒)
 *
 * 全部声音都由共享合成核心生成：两小节 house 鼓组、两小节碎拍、一条贝斯、
 * 两层铺底、几个铃音；没有任何外部音频文件。
 *
 * 0–4s  four-on-floor + 贝斯 C2/G2 + 铺底 C3
 * 4–8s  breakbeat + 贝斯 F2/D2 + 铺底 F3 + 铃音收尾
 *
 * 运行:node --experimental-strip-types films/groove.ts groove.mp4
 */
import { Film, bands, grain, shape, text } from '../packages/open-cut/dist/index.js';

const film = new Film({ width: 1280, height: 720, fps: 30 });
const ACCENT = '#7aa2ff';
const HOT = '#e8b86d';

const sections = [
    { label: 'FOUR ON THE FLOOR', color: ACCENT },
    { label: 'BREAKBEAT', color: HOT },
];

sections.forEach((section, index) => {
    film.scene({
        duration: 4,
        background: { kind: 'solid', color: index === 0 ? '#05070f' : '#0a1024' },
        camera: { zoomFrom: 1.0, zoomTo: 1.07, focusFrom: [0.5, 0.5], focusTo: [0.5, 0.47], ease: 'in-out-cubic' },
        items: [
            bands({ at: 0, dur: 4, count: 2, angle: -10, speed: 42, color: section.color, alpha: 0.18, thickness: 300 }),
            shape({
                at: 0,
                dur: 4,
                shape: 'ring',
                x: 0.5,
                y: 0.42,
                w: 0.26,
                h: 0.26,
                color: section.color,
                stroke: 3,
            }),
            text({
                at: 0.1,
                y: 0.62,
                size: 38,
                bold: true,
                color: '#e9f0fb',
                content: section.label,
                rise: 16,
                stagger: 2,
                dur: 3.4,
            }),
            grain({ at: 0, dur: 4, strength: 0.06, density: 12000 }),
        ],
    });
});

const bassline: Array<{ at: number; note: number }> = [
    { at: 0, note: 36 },
    { at: 1, note: 43 },
    { at: 2, note: 36 },
    { at: 3, note: 43 },
    { at: 4, note: 41 },
    { at: 5, note: 38 },
    { at: 6, note: 41 },
    { at: 7, note: 38 },
];

film.audio({
    patterns: [
        { at: 0, preset: 'four-on-floor', bpm: 120, bars: 2, volume: 0.8 },
        { at: 4, preset: 'breakbeat', bpm: 120, bars: 2, volume: 0.8 },
    ],
    notes: [
        ...bassline.map((note) => ({ at: note.at, instrument: 'bass' as const, note: note.note, duration: 0.6, velocity: 0.7 })),
        { at: 0, instrument: 'pad', note: 48, duration: 3.8, velocity: 0.35 },
        { at: 4, instrument: 'pad', note: 53, duration: 3.6, velocity: 0.35 },
        { at: 2.0, instrument: 'bell', note: 84, duration: 1.4, velocity: 0.4 },
        { at: 6.0, instrument: 'bell', note: 79, duration: 1.6, velocity: 0.45 },
        { at: 7.2, instrument: 'crash', velocity: 0.5 },
    ],
});

const stats = film.render(process.argv[2] ?? 'groove.mp4');
console.log(`rendered ${stats.frames} frames (${stats.seconds.toFixed(1)}s) -> ${stats.out}`);
console.log(`backend: ${stats.backend} · audio: ${stats.audio}`);
