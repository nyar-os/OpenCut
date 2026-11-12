/**
 * OpenCut 样张 ——「一条线的一生」(10 秒)
 *
 * 不是功能说明页,是镜头。全片只用一件道具:一根线。
 * 0.0–1.6  线从画面外划进来(描边)
 * 1.6–3.2  线折成台阶,镜头推入
 * 3.2–5.0  镜头拉开,露出那是一条时间轴
 * 5.0–7.0  时间轴烧成文字流(反转)
 * 7.0–9.0  流里只剩一行可执行的代码
 * 9.0–10.0 闪白,只剩标记
 *
 * 运行:node --experimental-strip-types films/teaser.ts teaser.mp4
 */
import { Film, bands, code, grain, shape, text } from '../packages/open-cut/dist/index.js';

const INK = '#e9f0fb';
const LINE = '#7aa2ff';
const HOT = '#e8b86d';

const film = new Film({ width: 1920, height: 1080, fps: 30 });

// 1 — 一根线划进来。没有标题,没有副标题。
film.scene({
    duration: 1.6,
    background: { kind: 'solid', color: '#04060c' },
    camera: { zoomFrom: 1.0, zoomTo: 1.04, ease: 'linear' },
    items: [
        shape({ at: 0, dur: 1.6, shape: 'line', x: -0.02, y: 0.52, w: 1.06, h: 0, color: LINE, stroke: 3, progress: 1, blend: 'add', fadeIn: 1, fadeOut: 2 }),
        grain({ strength: 0.09, density: 14000 }),
    ],
});

// 2 — 线折成台阶,镜头推入,两个字被挤出来。
film.scene({
    duration: 1.8,
    background: { kind: 'solid', color: '#04060c' },
    camera: { zoomFrom: 1.0, zoomTo: 1.34, focusFrom: [0.5, 0.52], focusTo: [0.46, 0.5], ease: 'out-cubic' },
    items: [
        shape({ at: 0, dur: 1.8, shape: 'line', x: 0.06, y: 0.72, w: 0.38, h: 0, color: LINE, stroke: 3, blend: 'add' }),
        shape({ at: 0.1, dur: 1.7, shape: 'line', x: 0.44, y: 0.72, w: 0, h: -0.18, color: LINE, stroke: 3, blend: 'add' }),
        shape({ at: 0.2, dur: 1.6, shape: 'line', x: 0.44, y: 0.54, w: 0.34, h: 0, color: LINE, stroke: 3, blend: 'add' }),
        shape({ at: 0.3, dur: 1.5, shape: 'line', x: 0.78, y: 0.54, w: 0, h: -0.16, color: LINE, stroke: 3, blend: 'add' }),
        text({ at: 0.25, y: 0.30, size: 210, bold: true, color: INK, content: '剪辑', rise: 90, stagger: 5, glow: LINE, dur: 1.55 }),
        grain({ strength: 0.09, density: 14000 }),
    ],
});

// 3 — 拉开。原来是一条时间轴,上面全是方块。
film.scene({
    duration: 1.8,
    background: { kind: 'solid', color: '#04060c' },
    camera: { zoomFrom: 1.5, zoomTo: 0.86, focusFrom: [0.62, 0.5], focusTo: [0.5, 0.5], ease: 'out-cubic' },
    items: [
        shape({ at: 0, dur: 1.8, shape: 'line', x: 0.03, y: 0.5, w: 0.94, h: 0, color: LINE, stroke: 2, blend: 'add' }),
        shape({ at: 0, dur: 1.8, shape: 'line', x: 0.03, y: 0.66, w: 0.90, h: 0, color: '#3d5a92', stroke: 2 }),
        shape({ at: 0.05, dur: 1.75, shape: 'line', x: 0.03, y: 0.34, w: 0.86, h: 0, color: '#3d5a92', stroke: 2 }),
        shape({ at: 0.2, dur: 1.6, shape: 'rect', x: 0.06, y: 0.455, w: 0.10, h: 0.09, color: '#1b3a7a', radius: 4 }),
        shape({ at: 0.3, dur: 1.5, shape: 'rect', x: 0.19, y: 0.455, w: 0.16, h: 0.09, color: '#24508f', radius: 4 }),
        shape({ at: 0.4, dur: 1.4, shape: 'rect', x: 0.38, y: 0.455, w: 0.07, h: 0.09, color: '#1b3a7a', radius: 4 }),
        shape({ at: 0.5, dur: 1.3, shape: 'rect', x: 0.49, y: 0.455, w: 0.21, h: 0.09, color: '#2a5da8', radius: 4 }),
        shape({ at: 0.6, dur: 1.2, shape: 'rect', x: 0.74, y: 0.455, w: 0.12, h: 0.09, color: '#1b3a7a', radius: 4 }),
        text({ at: 0.5, x: 0.055, y: 0.75, size: 30, color: '#5d6f8c', align: 'left', content: '2026 · 还有人在手动拖这些方块', dur: 1.3 }),
        grain({ strength: 0.09, density: 14000 }),
    ],
});

// 4 — 反转:方块停住,整条轴烧成一束光带。
film.scene({
    duration: 2.0,
    background: { kind: 'solid', color: '#04060c' },
    camera: { zoomFrom: 1.0, zoomTo: 1.18, focusFrom: [0.5, 0.5], focusTo: [0.5, 0.48], ease: 'in-out-cubic' },
    items: [
        bands({ at: 0, dur: 2.0, count: 2, angle: -12, speed: 34, color: '#6ea0ff', alpha: 0.20, thickness: 320 }),
        shape({ at: 0, dur: 1.9, shape: 'line', x: 0.03, y: 0.5, w: 0.94, h: 0, color: HOT, stroke: 4, blend: 'add' }),
        text({ at: 0.15, y: 0.20, size: 76, bold: true, color: INK, content: '它本来就是文本', rise: 60, stagger: 3, dur: 1.85 }),
        grain({ strength: 0.1, density: 16000 }),
    ],
});

// 5 — 流里只剩一行代码,其他全部让开。
film.scene({
    duration: 1.6,
    background: { kind: 'solid', color: '#04060c' },
    camera: { zoomFrom: 1.0, zoomTo: 1.08, ease: 'linear' },
    items: [
        bands({ at: 0, dur: 1.6, count: 2, angle: -8, speed: 18, color: '#4d7bd0', alpha: 0.18, thickness: 380 }),
        code({
            at: 0,
            y: 0.42,
            x: 0.16,
            size: 92,
            dur: 1.6,
            typing: 0.55,
            theme: { panel: null, plain: '#cfdcf2', keyword: '#7aa2ff', fn: '#e8b86d', string: '#6fd6a4' },
            lines: ['film.render()'],
        }),
        grain({ strength: 0.08, density: 12000 }),
    ],
});

// 6 — 闪白,只剩一个标记。
film.scene({
    duration: 1.2,
    background: { kind: 'solid', color: '#f4f7ff' },
    items: [
        text({ at: 0.05, y: 0.44, size: 54, bold: true, color: '#0a1024', content: 'OpenCut', rise: 24, stagger: 2, dur: 1.1 }),
    ],
});

film.audio({
    bgm: { volume: 0.05 },
    sfx: [
        { at: 0, kind: 'sub', volume: 0.5 },
        { at: 1.6, kind: 'glitch', volume: 0.35 },
        { at: 3.4, kind: 'riser', volume: 0.4 },
        { at: 5.0, kind: 'impact', volume: 0.55 },
        { at: 6.6, kind: 'sub', volume: 0.45 },
        { at: 8.2, kind: 'glitch', volume: 0.3 },
        { at: 9.0, kind: 'riser', volume: 0.35 },
    ],
});

const stats = film.render(process.argv[2] ?? 'teaser.mp4');
console.log(`rendered ${stats.frames} frames (${stats.seconds.toFixed(1)}s) -> ${stats.out}`);
console.log(`backend: ${stats.backend} · audio: ${stats.audio}`);
