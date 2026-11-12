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
node --experimental-strip-types films/demo.ts out/demo.mp4
```

Or through the CLI: `open-cut render films/demo.ts --out out/demo.mp4`.

The native binding is published for Windows x64 only. Media Foundation is
present on all mainstream Windows editions; N/KN editions require the Media
Feature Pack.

## What the pipeline does

| Stage | Implementation |
|---|---|
| Authoring | TypeScript DSL (`Film`, `text`, `code`, `counter`, `card`, `shape`, `footnote`, `progress`); seconds in, frames out |
| IR | `crates/core/src/scene.rs` — one serializable `Project`; no other input shape exists |
| Raster | `paint.rs` software framebuffer (fill, gradient, rounded rect, ring, line, glow, starfield, vignette) at RGBA8, converted to NV12 |
| Text | `text.rs` — real font rasterization with a glyph cache, CJK/Latin wrapping, a small code highlighter, per-glyph font fallback |
| Audio | `audio.rs` — BGM pad, sparse plucks, whoosh/tick/impact synthesized in-process, mixed to PCM16 |
| Encode | `encode.rs` — H.264 video plus audio through the Windows Media Foundation sink writer |

Audio codec is negotiated: AAC is preferred and the encoder falls back to FLAC
when the host image has no AAC encoder MFT registered (verified on Windows 10
24H2 Pro, where only the AAC *decoder* is present).

## Narration is a slot, not a generator

The pipeline reserves a narration track and mixes a PCM16 WAV you supply at a
given frame offset. Nothing in OpenCut synthesizes speech.

```ts
film.audio({ bgm: { volume: 0.17 }, narration: { wav: 'voice.wav', delay: 0.5 }, sfx: [...] });
```

## Scope today

Supported: fixed-timeline scenes, text/code/counter/card/shape/footnote/
progress items, starfield and gradient backgrounds, synthesized bed, MP4 out.

Not yet: media import (video/image/audio clips), easing keyframes on arbitrary
properties, transitions, multi-track compositing, non-Windows encoders.
