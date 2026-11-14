/**
 * OpenCut 样张 ——「一条线的一生」(12 秒)
 *
 * 画面而不是字卡:先是一座会自己长出来的山,再揭露那条山脊就是时间轴,
 * 最后它烧成一行可执行的代码。
 *
 * 0.0–2.2  夜、落日、两层山脊剪影,镜头缓推
 * 2.2–4.6  山脊线自己画出来,镜头横移
 * 4.6–7.2  方块在山脊上亮起,镜头推近
 * 7.2–9.4  方块停住,山被光带冲散,大字浮现
 * 9.4–11.0 只剩一行代码
 * 11.0–12  闪白,落款
 *
 * 运行:node --experimental-strip-types films/teaser.ts teaser.mp4
 */
import { pathToFileURL } from 'node:url';
import { Film, bands, code, grain, path, shape, text } from '../packages/open-cut/dist/index.js';

const INK = '#e9f0fb';
const ACCENT = '#7aa2ff';
const HOT = '#e8b86d';

/** A ridge silhouette: a few control points, smoothed and closed to the floor. */
const film = new Film({ width: 1920, height: 1080, fps: 30 });

// 1 — 夜、落日、两层山。没有标题。
film.scene({
    duration: 2.2,
    background: { kind: 'v-gradient', colors: ['#0a1024', '#1b2545', '#05070f'] },
    camera: { zoomFrom: 1.0, zoomTo: 1.1, focusFrom: [0.5, 0.6], focusTo: [0.52, 0.56], ease: 'in-out-cubic' },
    items: [
        shape({ at: 0, dur: 2.2, shape: 'circle', x: 0.66, y: 0.50, w: 0.30, color: '#f2c98a', blend: 'add', fadeIn: 1 }),
        path({
            at: 0,
            dur: 2.2,
            points: [[0.0, 0.72], [0.18, 0.58], [0.34, 0.66], [0.5, 0.52], [0.68, 0.62], [0.84, 0.55], [1.0, 0.64], [1.0, 1.0], [0.0, 1.0]],
            smooth: true,
            closed: true,
            fill: '#101a33',
            fadeIn: 1,
        }),
        path({
            at: 0,
            dur: 2.2,
            points: [[0.0, 0.86], [0.22, 0.74], [0.42, 0.82], [0.6, 0.72], [0.78, 0.8], [1.0, 0.76], [1.0, 1.0], [0.0, 1.0]],
            smooth: true,
            closed: true,
            fill: '#070c17',
            fadeIn: 1,
        }),
        grain({ strength: 0.09, density: 15000 }),
    ],
});

// 2 — 山脊线自己画出来,镜头横移。
film.scene({
    duration: 2.4,
    background: { kind: 'v-gradient', colors: ['#0a1024', '#1b2545', '#05070f'] },
    camera: { zoomFrom: 1.06, zoomTo: 1.02, focusFrom: [0.42, 0.6], focusTo: [0.58, 0.6], ease: 'in-out-cubic' },
    items: [
        shape({ at: 0, dur: 2.4, shape: 'circle', x: 0.72, y: 0.48, w: 0.34, color: '#f2c98a', blend: 'add', fadeIn: 1 }),
        path({
            at: 0,
            dur: 2.4,
            points: [[0.0, 1.0], [0.0, 0.72], [0.18, 0.58], [0.34, 0.66], [0.5, 0.52], [0.68, 0.62], [0.84, 0.55], [1.0, 0.64], [1.0, 1.0]],
            smooth: true,
            closed: true,
            fill: '#0c1528',
            fadeIn: 1,
        }),
        path({
            at: 0.15,
            dur: 2.25,
            points: [[0.0, 0.72], [0.18, 0.58], [0.34, 0.66], [0.5, 0.52], [0.68, 0.62], [0.84, 0.55], [1.0, 0.64]],
            smooth: true,
            stroke: 4,
            color: ACCENT,
            blend: 'add',
            progress: 1,
            fadeIn: 2,
        }),
        text({ at: 0.9, x: 0.07, y: 0.86, size: 30, color: '#8fa3c8', align: 'left', content: '每一段起伏,都是一次剪辑决定', dur: 1.5 }),
        grain({ strength: 0.09, density: 15000 }),
    ],
});

// 3 — 方块在山脊上亮起。镜头推近。
film.scene({
    duration: 2.6,
    background: { kind: 'v-gradient', colors: ['#0a1024', '#16203d', '#05070f'] },
    camera: { zoomFrom: 1.0, zoomTo: 1.3, focusFrom: [0.5, 0.6], focusTo: [0.5, 0.62], ease: 'in-out-cubic' },
    items: [
        path({
            at: 0,
            dur: 2.6,
            points: [[0.0, 0.74], [0.2, 0.62], [0.36, 0.7], [0.52, 0.56], [0.7, 0.66], [0.86, 0.58], [1.0, 0.68]],
            smooth: true,
            stroke: 3,
            color: '#5f86d6',
            fadeIn: 1,
        }),
        shape({ at: 0.2, dur: 2.2, shape: 'rect', x: 0.14, y: 0.665, w: 0.09, h: 0.05, color: '#2f5fb0', radius: 3 }),
        shape({ at: 0.4, dur: 2.0, shape: 'rect', x: 0.26, y: 0.645, w: 0.12, h: 0.05, color: '#3d76c8', radius: 3 }),
        shape({ at: 0.6, dur: 1.8, shape: 'rect', x: 0.42, y: 0.6, w: 0.06, h: 0.05, color: '#2f5fb0', radius: 3 }),
        shape({ at: 0.8, dur: 1.6, shape: 'rect', x: 0.55, y: 0.61, w: 0.13, h: 0.05, color: '#4a88dd', radius: 3 }),
        shape({ at: 1.0, dur: 1.4, shape: 'rect', x: 0.75, y: 0.625, w: 0.08, h: 0.05, color: '#2f5fb0', radius: 3 }),
        text({ at: 1.2, x: 0.07, y: 0.84, size: 28, color: '#5d6f8c', align: 'left', content: '2026 · 还有人在手动拖这些方块', dur: 1.3 }),
        grain({ strength: 0.1, density: 16000 }),
    ],
});

// 4 — 方块停住,山被光带冲散,大字浮现。
film.scene({
    duration: 2.2,
    background: { kind: 'solid', color: '#05070f' },
    camera: { zoomFrom: 1.24, zoomTo: 1.0, focusFrom: [0.5, 0.62], focusTo: [0.5, 0.5], ease: 'out-cubic' },
    items: [
        bands({ at: 0, dur: 2.2, count: 2, angle: -10, speed: 46, color: '#6ea0ff', alpha: 0.22, thickness: 340 }),
        path({
            at: 0,
            dur: 2.2,
            points: [[0.06, 0.62], [0.3, 0.56], [0.5, 0.6], [0.72, 0.55], [0.94, 0.6]],
            smooth: true,
            stroke: 4,
            color: HOT,
            blend: 'add',
            progress: 1,
            fadeIn: 2,
            fadeOut: 6,
        }),
        text({ at: 0.3, y: 0.24, size: 84, bold: true, color: INK, content: '它本来就是文本', rise: 64, stagger: 3, dur: 1.9 }),
        grain({ strength: 0.1, density: 16000 }),
    ],
});

// 5 — 只剩一行代码。
film.scene({
    duration: 1.6,
    background: { kind: 'solid', color: '#05070f' },
    camera: { zoomFrom: 1.0, zoomTo: 1.06, ease: 'linear' },
    items: [
        bands({ at: 0, dur: 1.6, count: 2, angle: -6, speed: 20, color: '#4d7bd0', alpha: 0.16, thickness: 400 }),
        code({
            at: 0,
            y: 0.42,
            x: 0.15,
            size: 92,
            dur: 1.6,
            typing: 0.55,
            theme: { panel: null, plain: '#cfdcf2', keyword: '#7aa2ff', fn: '#e8b86d', string: '#6fd6a4' },
            lines: ['film.render()'],
        }),
        grain({ strength: 0.08, density: 12000 }),
    ],
});

// 6 — 闪白,落款。
film.scene({
    duration: 1.0,
    background: { kind: 'solid', color: '#f4f7ff' },
    items: [text({ at: 0.02, y: 0.44, size: 52, bold: true, color: '#0a1024', content: 'OpenCut', rise: 22, stagger: 2, dur: 0.95 })],
});

film.audio({
    bgm: { volume: 0.05 },
    sfx: [
        { at: 0, kind: 'sub', volume: 0.45 },
        { at: 2.2, kind: 'riser', volume: 0.32 },
        { at: 4.6, kind: 'tick', volume: 0.4 },
        { at: 5.0, kind: 'tick', volume: 0.35 },
        { at: 5.4, kind: 'tick', volume: 0.35 },
        { at: 7.2, kind: 'impact', volume: 0.55 },
        { at: 8.4, kind: 'glitch', volume: 0.3 },
        { at: 9.4, kind: 'sub', volume: 0.4 },
        { at: 11.0, kind: 'riser', volume: 0.3 },
    ],
});

export default film;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const stats = film.render(process.argv[2] ?? 'teaser.mp4');
    console.log(`rendered ${stats.frames} frames (${stats.seconds.toFixed(1)}s) -> ${stats.out}`);
    console.log(`backend: ${stats.backend} · audio: ${stats.audio}`);
}
