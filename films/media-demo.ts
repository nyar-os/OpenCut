/**
 * OpenCut 示意片之二 ——「素材导入」
 *
 * 演示本轮新增能力:图片、视频、音频三种素材从磁盘导入,参与真实合成。
 * 全部素材由 OpenCut 自己生成(films/assets),再被导入,构成闭环验证。
 *
 * 运行:node --experimental-strip-types films/media-demo.ts demo-media.mp4
 */
import { pathToFileURL } from 'node:url';
import { Film, card, footnote, image, progress, text, video } from '../packages/open-cut/dist/index.js';

const TITLE = '#e6eefa';
const SUB = '#8fa3c8';
const ACCENT = '#7aa2ff';
const GOLD = '#e8b86d';

const POSTER = 'films/assets/poster.png';
const LOOP = 'films/assets/loop.mp4';
const BEAT = 'films/assets/beat.wav';

const film = new Film({ width: 1920, height: 1080, fps: 30 });

// 1 — 开场:海报铺满并压暗,作为背景素材
film.scene({
    duration: 4,
    background: { kind: 'solid', color: '#04060d' },
    items: [
        image({ src: POSTER, x: 0.5, y: 0.5, w: 1.0, h: 1.0, fit: 'cover', opacity: 0.16, fadeIn: 0.6, dur: 4 }),
        text({ at: 0.4, y: 0.42, size: 86, bold: true, color: TITLE, content: '素材，进来了', glow: ACCENT, dur: 3.4, driftY: 20 }),
        text({ at: 1.0, y: 0.56, size: 34, color: SUB, content: 'Images · Video · Audio — decoded in-process', dur: 2.8 }),
        progress(),
    ],
});

// 2 — 图片:同一个文件,contain 与 cover 两种适配
film.scene({
    duration: 9,
    background: { kind: 'v-gradient', colors: ['#05070f', '#0b1226'] },
    items: [
        text({ y: 0.10, size: 50, bold: true, color: TITLE, content: '图片：一张 PNG，两种适配', dur: 8.6 }),
        image({ at: 0.3, src: POSTER, x: 0.27, y: 0.44, w: 0.30, h: 0.46, fit: 'contain', radius: 16, dur: 8.2, fadeIn: 0.5 }),
        text({ at: 0.9, y: 0.72, x: 0.27, size: 30, color: SUB, content: 'contain · 完整可见', dur: 7.4 }),
        image({ at: 1.5, src: POSTER, x: 0.73, y: 0.44, w: 0.30, h: 0.46, fit: 'cover', radius: 16, dur: 7.2, fadeIn: 0.5 }),
        text({ at: 2.1, y: 0.72, x: 0.73, size: 30, color: SUB, content: 'cover · 填满裁切', dur: 6.4 }),
        footnote({ text: '素材：films/assets/poster.png，由 OpenCut 光栅器与自研 PNG 编码器生成', dur: 7, y: 0.90 }),
        progress(),
    ],
});

// 3 — 视频:按时间逐帧解码,并演示源内偏移
film.scene({
    duration: 8,
    background: { kind: 'starfield', base: ['#04060d', '#0a1024'], stars: 110, tint: '#9fb4e8', drift: 3, twinkle: 0.6 },
    items: [
        text({ y: 0.10, size: 50, bold: true, color: TITLE, content: '视频：逐帧解码，可指定入点', dur: 7.6 }),
        video({ at: 0.2, src: LOOP, srcIn: 45, x: 0.5, y: 0.48, w: 0.62, h: 0.44, fit: 'contain', radius: 14, dur: 6.6, fadeIn: 0.5 }),
        text({ at: 1.2, y: 0.76, size: 30, color: SUB, content: 'srcIn: 45 —— 从源片第 45 帧开始播', dur: 6.0 }),
        footnote({ text: '素材：films/assets/loop.mp4，由 OpenCut 自身渲染，导入时经 Media Foundation 解码', dur: 7, y: 0.90 }),
        progress(),
    ],
});

// 4 — 音频:导入音轨混入音床
film.scene({
    duration: 7,
    background: { kind: 'v-gradient', colors: ['#0a0f1e', '#141f3a'] },
    items: [
        text({ y: 0.14, size: 50, bold: true, color: TITLE, content: '音频：作为音轨混入', dur: 6.6 }),
        card({ at: 0.4, x: 0.32, y: 0.44, w: 0.26, h: 0.22, title: 'beat.wav', body: '120 BPM · 代码合成', dur: 6.2 }),
        card({ at: 1.1, x: 0.68, y: 0.44, w: 0.26, h: 0.22, title: 'mix', body: '与人声槽位、合成 BGM 并行', dur: 5.5 }),
        text({ at: 2.0, y: 0.66, size: 32, color: GOLD, content: '正在播放导入音轨 —— 请开声音', dur: 4.6 }),
        footnote({ text: '素材：films/assets/beat.wav，由 OpenCut 采样级合成并写入 PCM16', dur: 6, y: 0.90 }),
        progress(),
    ],
});

// 5 — 收尾:能力清单
film.scene({
    duration: 6,
    background: { kind: 'radial', center: '#0b1226', edge: '#04060d' },
    items: [
        text({ y: 0.30, size: 58, bold: true, color: TITLE, content: '素材已是时间轴上的普通数据', glow: ACCENT, dur: 5.6 }),
        text({ at: 0.8, y: 0.45, size: 34, color: SUB, content: 'image · video · audio 皆可被脚本编排', dur: 4.8 }),
        text({ at: 1.6, y: 0.60, size: 30, color: '#5d6f8c', content: '下一步:变换与关键帧、转场、多轨合成', dur: 4.0 }),
        text({ at: 2.4, y: 0.78, size: 26, color: '#42536e', content: '本片全部画面与声音由 OpenCut 自研管线产出', dur: 3.4 }),
        progress(),
    ],
});

film.audio({
    bgm: { volume: 0.10, mood: 'pad' },
    narration: null,
    // 第 4 幕开始播放导入音轨,铺到片尾
    clips: [{ src: BEAT, at: 21, volume: 0.9 }],
    sfx: [
        { at: 0, kind: 'impact', volume: 0.45 },
        { at: 4, kind: 'whoosh', volume: 0.4 },
        { at: 12, kind: 'whoosh', volume: 0.4 },
        { at: 28, kind: 'impact', volume: 0.4 },
    ],
});

export default film;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const stats = film.render(process.argv[2] ?? 'demo-media.mp4');
    console.log(`rendered ${stats.frames} frames (${stats.seconds.toFixed(1)}s) -> ${stats.out}`);
    console.log(`backend: ${stats.backend} · audio: ${stats.audio} · ${Math.round(stats.bytes / 1024)} KiB`);
}
