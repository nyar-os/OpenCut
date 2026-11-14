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
cargo run -p opencut-core --release --example make_assets   # writes films/assets
node --experimental-strip-types films/demo.ts out/demo.mp4
node --experimental-strip-types films/media-demo.ts out/media-demo.mp4
```

Or through the CLI: `open-cut render films/demo.ts --out out/demo.mp4`.

The native binding is published for Windows x64 only. Media Foundation is
present on all mainstream Windows editions; N/KN editions require the Media
Feature Pack.

## What the pipeline does

| Stage | Implementation |
|---|---|
| Authoring | TypeScript DSL (`Film`, `text`, `code`, `counter`, `card`, `shape`, `footnote`, `image`, `video`, `progress`); seconds in, frames out |
| IR | `crates/core/src/scene.rs` — one serializable `Project`; no other input shape exists |
| Import | `media.rs` — images through WIC, video frames and audio through a Media Foundation source reader, cached per path |
| Raster | `paint.rs` software framebuffer (fill, gradient, rounded rect, ring, line, glow, starfield, vignette, scaled bitmaps) at RGBA8, converted to NV12 |
| Text | `text.rs` — real font rasterization with a glyph cache, CJK/Latin wrapping, a small code highlighter, per-glyph font fallback |
| Audio | `audio.rs` — synthesized BGM/effects plus imported clips, mixed to PCM16 |
| Encode | `encode.rs` — H.264 video plus audio through the Windows Media Foundation sink writer |

Audio codec is negotiated: AAC is preferred and the encoder falls back to FLAC
when the host image has no AAC encoder MFT registered (verified on Windows 10
24H2 Pro, where only the AAC *decoder* is present).

## Media import

```ts
film.scene({
    duration: 8,
    items: [
        image({ src: 'poster.png', x: 0.27, y: 0.44, w: 0.3, h: 0.46, fit: 'contain', radius: 16 }),
        video({ src: 'loop.mp4', srcIn: 45, x: 0.73, y: 0.44, w: 0.3, h: 0.46, fit: 'cover' }),
    ],
});
film.audio({ clips: [{ src: 'beat.wav', at: 21, volume: 0.9 }] });
```

- `fit` is `contain`, `cover` or `stretch`; `radius` clips the result to rounded corners.
- `srcIn` is the first source *frame* to show, so a clip can start mid-file.
- Relative paths are resolved against the process working directory; MF needs
  absolute paths and the core converts them.
- A failed import degrades to nothing for that item instead of aborting the
  render. Imported audio that fails stays silent.
- Video is decoded forward with a held decoder position; seeking backwards
  reopens the source. Requests past the end hold the last frame.

## Narration is a slot, not a generator

The pipeline reserves a narration track and mixes a PCM16 WAV you supply at a
given frame offset. Narration itself is never synthesized — but singing is.

```ts
film.audio({ bgm: { volume: 0.17 }, narration: { wav: 'voice.wav', delay: 0.5 }, sfx: [...] });
```

## Sound effects and singing are synthesized

Both halves of the sound pair come from the shared core; no audio asset is
needed. Effects name a family (`whoosh`, `impact`, `riser`, `tick`, `glitch`,
`sub`, `ambience`, `sparkle`) or a catalogue preset (`impact-deep`,
`riser-tension`, …), and a song is a syllable list sung by `media.voice`:

```ts
film.audio({
    sfx: [
        { at: 0, preset: 'impact-deep', volume: 0.5 },
        { at: 3, kind: 'whoosh', pitch: 1.3, brightness: 0.8 },
    ],
    voice: [{
        at: 2.6,
        song: {
            tempoBpm: 100,
            syllables: [
                { onset: 'r', vowel: 'a', pitch: 392, beats: 1 },
                { vowel: 'o', pitch: 440, beats: 1 },
            ],
        },
    }],
});
```

- `kind` and `preset` are mutually exclusive; unknown names and out-of-range
  parameters are explicit errors, never silent substitutions.
- Effect parameters (`duration`, `pitch`, `brightness`, `intensity`, `pan`,
  `seed`) override the resolved base spec; omitted fields keep family/preset
  defaults.
- A song uses the five vowels (`a e i o u`), onset classes (`s t n r w y f`),
  pitch in Hz and duration in beats; the same song and `seed` always render
  byte-identically.
- `films/voice-sfx.ts` is the reference: 8 seconds of effects plus a sung
  line, rendered without any audio file.

## Scope today

Supported: fixed-timeline scenes, text/code/counter/card/shape/footnote/
progress items, image and video clips with fit modes, imported audio, starfield
and gradient backgrounds, synthesized effects and singing, MP4 out.

Not yet: property keyframes and easing on arbitrary fields, transitions,
multi-track compositing (items paint in list order, one scene at a time),
lyrics/phoneme tracks beyond the contracted vowel and onset classes, speech
narration synthesis, non-Windows decoders and encoders.
