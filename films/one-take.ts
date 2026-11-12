/**
 * OpenCut 样张 ——「一镜到底:从一条线到一座山」(14 秒)
 *
 * 全片只有一个场景、没有一次剪切。镜头是一条连续的缩放曲线:
 * 从 1.62 倍贴近山脊,一路拉到 1.0 的全景,再推回 1.30 落在代码上。
 * 不同尺度各自有一层内容,靠 zoom 窗口交叉淡出/淡入完成交接,
 * 所以观众的视线一直跟着同一条线,而这条线在放大时长成山、
 * 在拉远时变成风景、在回推时变成一行可执行的代码。
 *
 * 运行:node --experimental-strip-types films/one-take.ts one-take.mp4
 */
import { Film, bands, code, glow, grain, layer, path, shape, text } from '../packages/open-cut/dist/index.js';

/** One ridge, used by every layer so the cross-fades line up exactly. */
const RIDGE: Array<[number, number]> = [
    [0.0, 0.70],
    [0.14, 0.61],
    [0.28, 0.66],
    [0.42, 0.56],
    [0.56, 0.64],
    [0.70, 0.58],
    [0.86, 0.65],
    [1.0, 0.61],
];

/** A farther ridge, dimmer: depth without another cut. */
const FAR_RIDGE: Array<[number, number]> = [
    [0.0, 0.52],
    [0.16, 0.58],
    [0.34, 0.5],
    [0.52, 0.57],
    [0.72, 0.51],
    [0.88, 0.57],
    [1.0, 0.54],
];

/** The ridge closed down to the bottom so it can be filled as a mass. */
const RIDGE_MASS: Array<[number, number]> = [...RIDGE, [1.0, 1.0], [0.0, 1.0]];
const FAR_MASS: Array<[number, number]> = [...FAR_RIDGE, [1.0, 1.0], [0.0, 1.0]];

/** Every layer puts the light in the same world spot, so a cross-fade between
 *  two scales reads as one sun changing brightness, not as two suns. */
const SUN: [number, number] = [0.60, 0.44];

const film = new Film({ width: 1920, height: 1080, fps: 30 });

// One scene, one camera curve. No key sits on a flat slope: the frame is always
// moving a little, which is what stops a hold from feeling like a slide.
film.camera([
    { at: 0.0, zoom: 1.62, focus: [0.44, 0.62], ease: 'in-out-cubic' },
    { at: 3.2, zoom: 1.30, focus: [0.48, 0.60], ease: 'in-out-cubic' },
    { at: 7.0, zoom: 1.01, focus: [0.52, 0.56], ease: 'in-out-cubic' },
    { at: 8.6, zoom: 1.08, focus: [0.50, 0.55], ease: 'in-out-cubic' },
    { at: 14.0, zoom: 1.30, focus: [0.50, 0.54], ease: 'in-out-cubic' },
]);

film.scene({
    duration: 14,
    background: { kind: 'v-gradient', colors: ['#0a1024', '#16203d', '#05070f'] },
    items: [
        // Atmosphere runs for the whole take, so every scale has air in it.
        bands({ at: 0, dur: 14, count: 3, angle: -12, speed: 22, color: '#4d7bd0', alpha: 0.13, thickness: 420 }),

        // --- near scale: the sun and a length of ridge, seen up close ---------
        layer({
            at: 0,
            dur: 7.2,
            zoomFrom: 1.42,
            zoomTo: 1.85,
            edge: 0.16,
            items: [
                glow({ at: 0, dur: 7.2, x: SUN[0], y: SUN[1], radius: 0.30, color: '#e8b86d', intensity: 0.5, fadeIn: 0.5 }),
                glow({ at: 0, dur: 7.2, x: SUN[0], y: SUN[1], radius: 0.07, color: '#ffe6bd', intensity: 1.0, fadeIn: 0.5 }),
                path({ at: 0, dur: 7.2, points: FAR_MASS, smooth: true, closed: true, fill: '#141f3c', fadeIn: 0.7 }),
                path({ at: 0, dur: 7.2, points: RIDGE_MASS, smooth: true, closed: true, fill: '#0c1528', fadeIn: 0.7 }),
                path({ at: 0, dur: 7.2, points: RIDGE, smooth: true, stroke: 3, color: '#a8c4ff', blend: 'add', progress: 1, fadeIn: 0.7 }),
                grain({ at: 0, dur: 7.2, strength: 0.06, density: 15000 }),
            ],
        }),

        // --- mid scale: the ridge becomes a mountain --------------------------
        layer({
            at: 0,
            dur: 10,
            zoomFrom: 1.08,
            zoomTo: 1.50,
            edge: 0.10,
            items: [
                glow({ at: 0, dur: 10, x: SUN[0], y: SUN[1], radius: 0.17, color: '#e8b86d', intensity: 0.5, fadeIn: 1 }),
                glow({ at: 0, dur: 10, x: SUN[0], y: SUN[1], radius: 0.045, color: '#ffe6bd', intensity: 0.95, fadeIn: 1 }),
                path({ at: 0, dur: 10, points: FAR_MASS, smooth: true, closed: true, fill: '#121d38', fadeIn: 1 }),
                path({ at: 0, dur: 10, points: FAR_RIDGE, smooth: true, stroke: 2, color: '#3f5c93', fadeIn: 1 }),
                path({ at: 0, dur: 10, points: RIDGE_MASS, smooth: true, closed: true, fill: '#0d1730', fadeIn: 1 }),
                path({ at: 0, dur: 10, points: RIDGE, smooth: true, stroke: 3, color: '#8fb4ff', blend: 'add', progress: 1, fadeIn: 1 }),
                grain({ at: 0, dur: 10, strength: 0.07, density: 16000 }),
            ],
        }),

        // --- wide scale: the same object, now a landscape ---------------------
        layer({
            at: 0,
            dur: 14,
            zoomFrom: 0.90,
            zoomTo: 1.12,
            edge: 0.08,
            items: [
                glow({ at: 0, dur: 14, x: SUN[0], y: SUN[1], radius: 0.11, color: '#e8b86d', intensity: 0.42, fadeIn: 1.4 }),
                path({ at: 0, dur: 14, points: FAR_MASS, smooth: true, closed: true, fill: '#111c36', fadeIn: 1.4 }),
                path({ at: 0, dur: 14, points: FAR_RIDGE, smooth: true, stroke: 2, color: '#3f5c93', fadeIn: 1.4 }),
                path({ at: 0, dur: 14, points: RIDGE_MASS, smooth: true, closed: true, fill: '#0c1528', fadeIn: 1.4 }),
                path({ at: 0, dur: 14, points: RIDGE, smooth: true, stroke: 2, color: '#6d93e0', progress: 1, fadeIn: 1.4 }),
                path({
                    at: 0,
                    dur: 14,
                    points: [[0.0, 1.0], [0.0, 0.80], [0.2, 0.87], [0.44, 0.81], [0.68, 0.89], [1.0, 0.83], [1.0, 1.0]],
                    smooth: true,
                    closed: true,
                    fill: '#04060d',
                    fadeIn: 1.4,
                }),
                text({ at: 3.4, x: 0.07, y: 0.33, size: 34, color: '#93a7cc', align: 'left', content: '一条山脊,一次剪辑决定', dur: 4.4 }),
                grain({ at: 0, dur: 14, strength: 0.08, density: 16000 }),
            ],
        }),

        // --- back in close: the line is a line of code ------------------------
        // Times here are relative to the layer start (9.4 s).
        layer({
            at: 9.4,
            dur: 4.6,
            zoomFrom: 1.12,
            zoomTo: 1.45,
            edge: 0.10,
            items: [
                // The scrim arrives with the layer, so the landscape is already
                // dark by the time type is legible on top of it.
                shape({ at: 0, dur: 4.6, shape: 'rect', x: -0.1, y: -0.1, w: 1.2, h: 1.2, color: '#05070f', fadeIn: 0.2 }),
                shape({
                    at: 0,
                    dur: 4.6,
                    shape: 'line',
                    x: 0.14,
                    y: 0.30,
                    w: 0.72,
                    h: 0,
                    color: '#e8b86d',
                    stroke: 2,
                    progress: 1,
                    fadeIn: 0.7,
                }),
                code({
                    at: 0.9,
                    y: 0.40,
                    x: 0.16,
                    size: 84,
                    dur: 5,
                    typing: 0.5,
                    theme: { panel: null, plain: '#cfdcf2', keyword: '#7aa2ff', fn: '#e8b86d', string: '#6fd6a4' },
                    lines: ['film.render()'],
                }),
                text({ at: 2.2, y: 0.62, size: 30, color: '#8fa3c8', content: 'OpenCut · 一镜到底', rise: 16, stagger: 2, dur: 3.0 }),
                grain({ at: 0, dur: 4.6, strength: 0.07, density: 14000 }),
            ],
        }),
    ],
});

film.audio({
    bgm: { volume: 0.06 },
    sfx: [
        { at: 0, kind: 'sub', volume: 0.42 },
        { at: 3.2, kind: 'whoosh', volume: 0.3 },
        { at: 7.0, kind: 'impact', volume: 0.45 },
        { at: 9.6, kind: 'riser', volume: 0.3 },
        { at: 11.6, kind: 'tick', volume: 0.3 },
        { at: 13.2, kind: 'glitch', volume: 0.22 },
    ],
});

const stats = film.render(process.argv[2] ?? 'one-take.mp4');
console.log(`rendered ${stats.frames} frames (${stats.seconds.toFixed(1)}s) -> ${stats.out}`);
console.log(`backend: ${stats.backend} · audio: ${stats.audio}`);
