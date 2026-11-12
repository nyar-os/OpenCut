# OpenCut

A code-first video editor: a film is a data structure, rendering is a compile step.
You describe scenes, tracks and keyframes in TypeScript; the Rust core rasterizes
every frame, synthesizes the audio bed and encodes H.264/AAC MP4 through the
Media Foundation that ships with Windows. No external media toolchain is used.

## Layout

| Path | Contents |
|---|---|
| `crates/core` | Scene IR, software rasterizer, text shaping, audio synthesis, Media Foundation encoder |
| `crates/napi` | Node-API surface (`renderProject`) over the core |
| `packages/open-cut` | TypeScript DSL authoring surface and `open-cut` CLI |
| `packages/open-cut-win32-x64` | Staged `.node` addon for Windows x64 |
| `films` | Example films written against the DSL |

## Quick start

```bash
pnpm install
pnpm run build
node --experimental-strip-types films/demo.ts
```

The native binding is published for Windows x64 only. Media Foundation is
present on all mainstream Windows editions; N/KN editions require the Media
Feature Pack.

Narration is a reserved audio slot: the pipeline mixes an optional PCM WAV
track under its own control; the demo films render with the synthesized bed only.
