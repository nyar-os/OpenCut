//! Generates the media fixtures the import demo consumes.
//!
//! Every asset is produced by OpenCut itself: the still comes from the
//! rasterizer plus the PNG writer, the sound from the WAV writer, and the clip
//! from a normal render. Nothing here reads an external asset.

use std::path::Path;

use opencut_core::audio::{SAMPLE_RATE, write_wav};
use opencut_core::color::{Rgba, parse_or};
use opencut_core::paint::{Frame, build_vignette};
use opencut_core::png::write_png;
use opencut_core::render::render_project;
use opencut_core::scene::Align;
use opencut_core::text::Fonts;

fn main() {
    let dir = Path::new("films/assets");
    std::fs::create_dir_all(dir).expect("create assets dir");

    write_poster(&dir.join("poster.png")).expect("poster");
    write_beat(&dir.join("beat.wav")).expect("beat");
    write_loop(&dir.join("loop.mp4")).expect("loop");
    println!("assets written to {}", dir.display());
}

/// A title card rendered by the same rasterizer the films use.
fn write_poster(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let (width, height) = (1200u32, 800u32);
    let mut frame = Frame::new(width, height);
    frame.v_gradient(&[
        parse_or(Some("#0a1024"), Rgba([10, 16, 36, 255])),
        parse_or(Some("#1b2a52"), Rgba([27, 42, 82, 255])),
        parse_or(Some("#05070f"), Rgba([5, 7, 15, 255])),
    ]);
    frame.starfield(180, Rgba([196, 214, 255, 255]), 0.0, 0.35, 1.7);
    frame.circle(160.0, 140.0, 90.0, Rgba([122, 162, 255, 40]), None);

    let mut fonts = Fonts::load()?;
    fonts.draw_block(
        &mut frame,
        "OpenCut",
        100.0,
        300.0,
        150.0,
        true,
        Rgba([240, 246, 255, 255]),
        Align::Left,
        Some(1000.0),
        1.1,
    );
    fonts.draw_block(
        &mut frame,
        "Code First 剪辑",
        104.0,
        500.0,
        56.0,
        false,
        Rgba([150, 176, 220, 255]),
        Align::Left,
        None,
        1.2,
    );
    fonts.draw_block(
        &mut frame,
        "时间轴是数据 · 成片是编译产物",
        104.0,
        590.0,
        34.0,
        false,
        Rgba([110, 132, 168, 255]),
        Align::Left,
        None,
        1.2,
    );
    frame.apply_vignette(&build_vignette(width, height, 0.5));
    write_png(path, width, height, &frame.pixels)?;
    Ok(())
}

/// A 120 BPM kick/hat pattern, synthesized sample by sample.
fn write_beat(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let seconds = 6.0;
    let total = (seconds * SAMPLE_RATE as f64) as usize;
    let mut interleaved: Vec<i16> = Vec::with_capacity(total * 2);
    let beat = 0.5; // one beat at 120 BPM
    for i in 0..total {
        let t = i as f64 / SAMPLE_RATE as f64;
        let position = t % beat;
        // Kick: low sine with a fast decay, on every beat.
        let kick_env = (-position * 26.0).exp();
        let kick = (2.0 * std::f64::consts::PI * (58.0 - position * 24.0) * position).sin()
            * kick_env
            * 0.75;
        // Hat: short noise burst on the off beat.
        let hat_phase = (t - beat * 0.5).rem_euclid(beat);
        let hat_env = (-hat_phase * 90.0).exp();
        let noise =
            ((i as u32).wrapping_mul(1_103_515_245).rotate_left(13) as f64 / u32::MAX as f64) * 2.0
                - 1.0;
        let hat = noise * hat_env * 0.16;
        let value = ((kick + hat).clamp(-1.0, 1.0) * (i16::MAX as f64) * 0.7) as i16;
        interleaved.push(value);
        interleaved.push(value);
    }
    write_wav(path.to_str().unwrap_or("beat.wav"), &interleaved)?;
    Ok(())
}

/// A short clip with real motion, rendered by the normal pipeline.
fn write_loop(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let project = serde_json::json!({
        "width": 960, "height": 540, "fps": 30, "durationFrames": 210,
        "scenes": [{
            "start": 0, "duration": 210,
            "background": { "kind": "v-gradient", "colors": ["#071022", "#132445"] },
            "items": [
                { "kind": "counter", "at": 0, "dur": 210, "from": 0.0, "to": 210.0,
                  "x": 0.5, "y": 0.36, "size": 190.0, "color": "#e8b86d",
                  "suffix": " f", "decimals": 0, "ease": "linear", "fadeIn": 1, "fadeOut": 1 },
                { "kind": "text", "at": 0, "dur": 210, "content": "素材片段 · source clip",
                  "size": 42.0, "bold": true, "color": "#cfe0ff", "x": 0.5, "y": 0.66,
                  "align": "center", "fadeIn": 1, "fadeOut": 1 },
                { "kind": "progress", "at": 0, "dur": 210, "y": 0.94 }
            ]
        }],
        "audio": null
    });
    let stats = render_project(&project.to_string(), path, &mut |_, _| {})?;
    println!("loop: {} frames -> {}", stats.frames, stats.out);
    Ok(())
}
