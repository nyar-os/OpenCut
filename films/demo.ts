/**
 * OpenCut 示意片 —「剪辑,不再需要时间轴」
 *
 * Vibe 知识大赏风格:暗场星空、双语字幕、逐句出处、代码逐帧渲染。
 * 本片的画面由 OpenCut 自己的渲染合成流产出:TS DSL → 场景 IR → Rust
 * 软件光栅 → Media Foundation 编码,不经过任何外部媒体工具。
 *
 * 运行:node --experimental-strip-types films/demo.ts
 */
import { Film, card, code, counter, footnote, progress, text } from '../packages/open-cut/dist/index.js';

const TITLE = '#e6eefa';
const SUB = '#8fa3c8';
const ACCENT = '#7aa2ff';
const GOLD = '#e8b86d';

const film = new Film({ width: 1920, height: 1080, fps: 30 });

// 1 — 钩子
film.scene({
    duration: 5,
    background: { kind: 'starfield', base: ['#04060d', '#0a1024'], stars: 150, tint: '#b8c8ff', drift: 4, twinkle: 0.7 },
    items: [
        text({ y: 0.40, size: 96, bold: true, color: TITLE, content: '如果剪辑，不再需要时间轴？', glow: ACCENT, fadeIn: 0.8, driftY: 26 }),
        text({ y: 0.56, size: 36, color: SUB, content: 'What if editing no longer needed a timeline?', fadeIn: 1.4 }),
        progress(),
    ],
});

// 2 — 痛点与现象:剪映付费墙,开源替代爆发
film.scene({
    duration: 8,
    background: { kind: 'starfield', base: ['#04060d', '#0a1024'], stars: 150, tint: '#b8c8ff', drift: 4, twinkle: 0.7 },
    items: [
        text({ y: 0.16, size: 52, bold: true, color: TITLE, content: '基础功能被一道道搬进付费墙', dur: 7.6 }),
        text({ y: 0.27, size: 30, color: SUB, content: '当 CapCut 把剪辑变成订阅生意', dur: 7.2 }),
        counter({ y: 0.42, from: 0, to: 71000, size: 160, color: GOLD, suffix: ' ★', dur: 6, ease: 'out-quint' }),
        text({ y: 0.62, size: 40, bold: true, color: TITLE, content: 'OpenCut：开源剪映替代', dur: 6 }),
        footnote({ text: '来源：GitHub OpenCut-app/OpenCut · 腾讯云开发者社区 2026', dur: 6, y: 0.88 }),
        progress(),
    ],
});

// 3 — 重写:一个 Rust 核心,五种开放能力
film.scene({
    duration: 9,
    background: { kind: 'v-gradient', colors: ['#05070f', '#0b1226'] },
    items: [
        text({ y: 0.12, size: 56, bold: true, color: TITLE, content: '团队选择推倒重写', dur: 8.6 }),
        text({ y: 0.23, size: 30, color: SUB, content: '一个 Rust 核心 · Web / 桌面 / 移动同一代码库', dur: 8.2 }),
        text({ at: 0.6, y: 0.38, size: 44, bold: true, color: ACCENT, content: 'Editor API', dur: 7.8, align: 'left', x: 0.14 }),
        text({ at: 1.4, y: 0.47, size: 44, bold: true, color: ACCENT, content: 'Plugin-first 架构', dur: 7.2, align: 'left', x: 0.14 }),
        text({ at: 2.2, y: 0.56, size: 44, bold: true, color: ACCENT, content: 'MCP 服务器 · AI Agent 直接接入', dur: 6.6, align: 'left', x: 0.14 }),
        text({ at: 3.0, y: 0.65, size: 44, bold: true, color: ACCENT, content: 'Headless 批量渲染', dur: 5.8, align: 'left', x: 0.14 }),
        text({ at: 3.8, y: 0.74, size: 44, bold: true, color: ACCENT, content: '编辑器内脚本面板', dur: 5.0, align: 'left', x: 0.14 }),
        footnote({ text: '来源：OpenCut GitHub README（重写版 Status 段）', dur: 8, y: 0.9 }),
        progress(),
    ],
});

// 4 — Code First:时间轴即数据,成片即编译产物
film.scene({
    duration: 11,
    background: { kind: 'starfield', base: ['#04060d', '#0a1024'], stars: 120, tint: '#9fb4e8', drift: 3, twinkle: 0.6 },
    items: [
        text({ y: 0.10, size: 56, bold: true, color: TITLE, content: 'Code First：剪辑就是写代码', dur: 10.6 }),
        code({
            y: 0.24,
            size: 34,
            dur: 10,
            typing: 1.1,
            lines: [
                '// 这一帧画面,来自这段代码本身',
                'film.scene({',
                '  duration: 8,',
                '  items: [ counter({ to: 71000, suffix: \' ★\' }) ],',
                '  background: { kind: \'starfield\' },',
                '})',
                'film.render(\'demo.mp4\')',
            ],
        }),
        text({ at: 7.5, y: 0.72, size: 34, color: SUB, content: '时间轴是数据 · 效果是函数 · 成片是编译产物', dur: 3.2 }),
        footnote({ text: '本片由 OpenCut 逐帧渲染：H.264 + FLAC · Media Foundation', dur: 9, y: 0.9 }),
        progress(),
    ],
});

// 5 — 为什么值得
film.scene({
    duration: 9,
    background: { kind: 'v-gradient', colors: ['#05070f', '#0b1226'] },
    items: [
        text({ y: 0.10, size: 56, bold: true, color: TITLE, content: '代码化剪辑带来什么？', dur: 8.6 }),
        card({ at: 0.4, x: 0.28, y: 0.38, title: '可 diff', body: '剪辑版本进入 Git', dur: 8 }),
        card({ at: 1.1, x: 0.72, y: 0.38, title: '可复现', body: '同一份代码，同一帧画面', dur: 7.4 }),
        card({ at: 1.8, x: 0.28, y: 0.68, title: '可批量', body: 'headless 一次出一千条', dur: 6.6 }),
        card({ at: 2.5, x: 0.72, y: 0.68, title: 'Agent 可写', body: 'AI 直接产出成片', dur: 5.8 }),
        progress(),
    ],
});

// 6 — OpenX 生态
film.scene({
    duration: 8,
    background: { kind: 'starfield', base: ['#04060d', '#0a1024'], stars: 150, tint: '#b8c8ff', drift: 5, twinkle: 0.7 },
    items: [
        text({ y: 0.14, size: 52, bold: true, color: TITLE, content: 'OpenX 生态 · 新成员', dur: 7.6 }),
        text({ y: 0.30, size: 34, color: SUB, content: 'OpenViewer · OpenCleaner · OpenDesktop · OpenDebugger', dur: 7.2 }),
        text({ at: 1.2, y: 0.50, size: 110, bold: true, color: GOLD, content: 'OpenCut', glow: GOLD, dur: 6, driftY: 20 }),
        text({ at: 2.0, y: 0.66, size: 40, bold: true, color: TITLE, content: 'Code First 剪辑软件', dur: 5.2 }),
        progress(),
    ],
});

// 7 — 收尾
film.scene({
    duration: 6,
    background: { kind: 'radial', center: '#0b1226', edge: '#04060d' },
    items: [
        text({ y: 0.36, size: 64, bold: true, color: TITLE, content: '时间轴，变成文本编辑器', glow: ACCENT, dur: 5.6 }),
        text({ y: 0.52, size: 36, color: SUB, content: '剪辑，变成编译', dur: 5 }),
        text({ at: 2.2, y: 0.72, size: 28, color: '#4a5b78', content: '本片画面与声音全部由 OpenCut 自研渲染合成流产出', dur: 3.4 }),
        progress(),
    ],
});

film.audio({
    bgm: { volume: 0.17, mood: 'pad' },
    narration: null,
    sfx: [
        { at: 0, kind: 'impact', volume: 0.5 },
        { at: 5, kind: 'whoosh', volume: 0.45 },
        { at: 13, kind: 'whoosh', volume: 0.45 },
        { at: 22, kind: 'whoosh', volume: 0.45 },
        { at: 33, kind: 'whoosh', volume: 0.45 },
        { at: 42, kind: 'whoosh', volume: 0.45 },
        { at: 50, kind: 'impact', volume: 0.5 },
        { at: 56, kind: 'whoosh', volume: 0.45 },
    ],
});

const stats = film.render(process.argv[2] ?? 'demo.mp4');
console.log(`rendered ${stats.frames} frames (${stats.seconds.toFixed(1)}s) -> ${stats.out}`);
console.log(`backend: ${stats.backend} · audio: ${stats.audio} · ${Math.round(stats.bytes / 1024)} KiB`);
