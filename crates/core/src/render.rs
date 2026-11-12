//! Frame orchestration: compile the scene IR into pixels and push them
//! through the encoder together with the synthesized audio bed.

use std::path::Path;

use crate::audio::build_audio;
use crate::color::{Rgba, parse, parse_or};
use crate::ease::{apply, fade};
use crate::encode::Encoder;
use crate::error::Error;
use crate::media::MediaLibrary;
use crate::paint::{Frame, build_vignette, hash, smooth_polyline};
use crate::scene::{Align, Background, Blend, Item, Project, ShapeKind};
use crate::text::Fonts;

/// Facts about a finished render.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderStats {
    pub frames: u32,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub seconds: f64,
    pub out: String,
    pub bytes: u64,
    pub backend: String,
    pub audio: bool,
}

/// Parses, validates and renders a project JSON string into `out`.
pub fn render_project(
    json: &str,
    out: &Path,
    progress: &mut dyn FnMut(u32, u32),
) -> Result<RenderStats, Error> {
    let project: Project =
        serde_json::from_str(json).map_err(|e| Error::invalid(format!("project json: {e}")))?;
    validate(&project)?;
    let mut fonts = Fonts::load()?;
    let mut media = MediaLibrary::new();
    let (w, h, fps) = (project.width, project.height, project.fps);
    let vignette = build_vignette(w, h, 0.55);
    let seconds = project.duration_frames as f64 / fps as f64;
    let has_audio = project.audio.is_some();
    let audio = build_audio(project.audio.as_ref(), seconds, fps, &mut media);
    let bitrate = (w * h * fps / 2).clamp(2_000_000, 20_000_000);
    let mut encoder = Encoder::open(out, w, h, fps, bitrate, has_audio)?;
    let audio_codec = encoder.audio_codec().to_string();

    let mut frame = Frame::new(w, h);
    let mut scratch = Frame::new(w, h);
    let total = project.duration_frames;
    let rate = crate::audio::SAMPLE_RATE as usize;
    let mut written_samples = 0usize;
    for f in 0..total {
        paint_frame(
            &project,
            &mut fonts,
            &mut media,
            &vignette,
            &mut scratch,
            f,
            &mut frame,
        );
        encoder.write_video(&frame.to_nv12(), f, fps)?;
        // Interleave audio with video in one-second blocks.
        if (f + 1) % fps == 0 || f + 1 == total {
            let end_samples = (((f + 1) as f64 / fps as f64) * rate as f64) as usize;
            let end_samples = end_samples.min(audio.len() / 2);
            if end_samples > written_samples {
                let chunk = &audio[written_samples * 2..end_samples * 2];
                encoder.write_audio(chunk, written_samples as u64)?;
                written_samples = end_samples;
            }
        }
        progress(f + 1, total);
    }
    encoder.finish()?;
    let bytes = std::fs::metadata(out).map(|m| m.len()).unwrap_or(0);
    Ok(RenderStats {
        frames: total,
        width: w,
        height: h,
        fps,
        seconds,
        out: out.display().to_string(),
        bytes,
        backend: if has_audio {
            format!("media-foundation+h264+{audio_codec}")
        } else {
            "media-foundation+h264".to_string()
        },
        audio: has_audio,
    })
}

fn validate(project: &Project) -> Result<(), Error> {
    if project.width % 2 == 1 || project.height % 2 == 1 {
        return Err(Error::invalid("width and height must be even for H.264"));
    }
    if project.width < 16 || project.height < 16 {
        return Err(Error::invalid("frame is too small"));
    }
    if project.fps == 0 || project.fps > 240 {
        return Err(Error::invalid("fps must be within 1..=240"));
    }
    if project.duration_frames == 0 {
        return Err(Error::invalid("duration_frames must be positive"));
    }
    for scene in &project.scenes {
        if scene.duration == 0 {
            return Err(Error::invalid("scene duration must be positive"));
        }
        if scene.start + scene.duration > project.duration_frames {
            return Err(Error::invalid(format!(
                "scene at {} exceeds duration {}",
                scene.start, project.duration_frames
            )));
        }
    }
    Ok(())
}

fn paint_frame(
    project: &Project,
    fonts: &mut Fonts,
    media: &mut MediaLibrary,
    vignette: &[u8],
    scratch: &mut Frame,
    frame_index: u32,
    out: &mut Frame,
) {
    out.fill(Rgba([0, 0, 0, 255]));
    let scene = project
        .scenes
        .iter()
        .find(|s| frame_index >= s.start && frame_index < s.start + s.duration);
    if let Some(scene) = scene {
        let seconds = frame_index as f32 / project.fps as f32;
        let local = frame_index - scene.start;
        // With a camera the scene renders off-screen, then that buffer is
        // pushed, pulled or panned into the output frame like a real lens.
        let camera = scene.camera.as_ref();
        let target: &mut Frame = if camera.is_some() {
            scratch.fill(Rgba([0, 0, 0, 255]));
            &mut *scratch
        } else {
            &mut *out
        };
        paint_background(target, &scene.background, seconds);
        for item in &scene.items {
            paint_item(
                project,
                fonts,
                media,
                target,
                item,
                local,
                frame_index,
                seconds,
            );
        }
        if let Some(camera) = camera {
            let t = if scene.duration > 1 {
                local as f32 / (scene.duration - 1) as f32
            } else {
                1.0
            };
            let eased = apply(camera.ease, t);
            let zoom = camera.zoom_from + (camera.zoom_to - camera.zoom_from) * eased;
            let focus = [
                camera.focus_from[0] + (camera.focus_to[0] - camera.focus_from[0]) * eased,
                camera.focus_from[1] + (camera.focus_to[1] - camera.focus_from[1]) * eased,
            ];
            out.resample_from(scratch, zoom, focus, camera.rotate_to * eased);
        }
    }
    out.apply_vignette(vignette);
}

fn paint_background(frame: &mut Frame, bg: &Background, seconds: f32) {
    match bg {
        Background::Solid { color } => frame.fill(parse_or(Some(color), Rgba([8, 10, 20, 255]))),
        Background::VGradient { colors } => {
            let stops: Vec<Rgba> = colors.iter().filter_map(|c| parse(c)).collect();
            if stops.is_empty() {
                frame.fill(Rgba([8, 10, 20, 255]));
            } else {
                frame.v_gradient(&stops);
            }
        }
        Background::Radial { center, edge } => {
            frame.radial(
                parse_or(Some(center), Rgba([12, 18, 38, 255])),
                parse_or(Some(edge), Rgba([4, 6, 12, 255])),
            );
        }
        Background::Starfield {
            base,
            stars,
            tint,
            drift,
            twinkle,
        } => {
            let stops: Vec<Rgba> = base.iter().filter_map(|c| parse(c)).collect();
            if stops.is_empty() {
                frame.fill(Rgba([5, 7, 15, 255]));
            } else {
                frame.v_gradient(&stops);
            }
            let tint = parse_or(tint.as_deref(), Rgba([180, 205, 255, 255]));
            frame.starfield(*stars, tint, *drift, *twinkle, seconds);
        }
    }
}

fn px(x: f32, w: u32) -> f32 {
    x * w as f32
}

fn paint_item(
    project: &Project,
    fonts: &mut Fonts,
    media: &mut MediaLibrary,
    frame: &mut Frame,
    item: &Item,
    local: u32,
    frame_index: u32,
    _seconds: f32,
) {
    let (w, h) = (project.width as f32, project.height as f32);
    match item {
        Item::Text {
            at,
            dur,
            content,
            sub,
            size,
            bold,
            color,
            sub_color,
            sub_size,
            x,
            y,
            align,
            fade_in,
            fade_out,
            drift_y,
            max_width,
            line_height,
            typing,
            glow,
            stagger,
            rise,
            clip,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let alpha = fade(life, *dur, *fade_in, *fade_out);
            if alpha <= 0.001 {
                return;
            }
            let drift = *drift_y * (1.0 - alpha);
            let mut visible = content.as_str();
            if let Some(speed) = typing {
                let count = ((life as f32 * speed).floor() as usize).min(content.chars().count());
                visible = &content[..content
                    .char_indices()
                    .nth(count)
                    .map(|(i, _)| i)
                    .unwrap_or(content.len())];
            }
            let color = parse_or(Some(color), Rgba([230, 238, 250, 255])).with_alpha(alpha);
            let limit = max_width.map(|m| m * w);
            let lh = line_height.unwrap_or(1.25);
            let top = px(*y, h as u32) - drift;
            // A reveal rectangle lets text grow out of a shape.
            if let Some(rect) = clip {
                frame.set_clip([
                    rect[0] * w,
                    rect[1] * h,
                    (rect[0] + rect[2]) * w,
                    (rect[1] + rect[3]) * h,
                ]);
            }
            let drawn = if *rise > 0.0 {
                // Character-by-character entrance reads as motion, not as a
                // block of text fading in.
                fonts.draw_staggered(
                    frame,
                    visible,
                    px(*x, w as u32),
                    top,
                    *size,
                    *bold,
                    color,
                    *align,
                    *stagger,
                    *rise,
                    life,
                )
            } else {
                fonts.draw_block(
                    frame,
                    visible,
                    px(*x, w as u32),
                    top,
                    *size,
                    *bold,
                    color,
                    *align,
                    limit,
                    lh,
                )
            };
            if let Some(glow_color) = glow {
                let gc = parse(glow_color);
                if let Some(gc) = gc {
                    frame.glow(
                        px(*x, w as u32),
                        px(*y, h as u32) - drift + drawn / 2.0,
                        *size * 2.2,
                        gc.with_alpha(alpha * 0.10),
                    );
                }
            }
            if let Some(sub_text) = sub {
                let sub_color = parse_or(sub_color.as_deref(), Rgba([140, 160, 195, 255]))
                    .with_alpha(alpha * 0.9);
                let sub_size = sub_size.unwrap_or(size * 0.42);
                fonts.draw_block(
                    frame,
                    sub_text,
                    px(*x, w as u32),
                    px(*y, h as u32) - drift + drawn + sub_size * 0.5,
                    sub_size,
                    false,
                    sub_color,
                    *align,
                    max_width.map(|m| m * w),
                    1.2,
                );
            }
            if clip.is_some() {
                frame.clear_clip();
            }
        }
        Item::Code {
            at,
            dur,
            lines,
            x,
            y,
            size,
            theme,
            fade_in,
            fade_out,
            typing,
            line_height,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let alpha = fade(life, *dur, *fade_in, *fade_out);
            if alpha <= 0.001 {
                return;
            }
            let lh = line_height.unwrap_or(1.5);
            let panel_pad = size * 0.9;
            let total_chars: usize = lines.iter().map(|l| l.chars().count()).sum();
            let visible_total = match typing {
                Some(speed) => (life as f32 * speed).floor() as usize,
                None => total_chars,
            };
            // The panel grows with the typewriter so it never looks pre-filled.
            let mut revealed = 0usize;
            let mut budget = visible_total;
            for line in lines {
                if budget == 0 {
                    break;
                }
                budget = budget.saturating_sub(line.chars().count());
                revealed += 1;
            }
            let revealed = revealed.max(1);
            let block_h = revealed as f32 * size * lh + panel_pad * 2.0;
            let widest = lines
                .iter()
                .map(|l| fonts.measure(l, *size, false, true))
                .fold(0.0f32, f32::max);
            let block_w = widest + panel_pad * 2.0;
            let ox = px(*x, project.width);
            let oy = px(*y, project.height);
            if let Some(pc) = theme.panel.as_deref().and_then(parse) {
                frame.round_rect(ox, oy, block_w, block_h, size * 0.6, pc.with_alpha(alpha));
            }
            let total_chars: usize = lines.iter().map(|l| l.chars().count()).sum();
            let visible_total = match typing {
                Some(speed) => (life as f32 * speed).floor() as usize,
                None => total_chars,
            };
            let mut used = 0usize;
            for (i, line) in lines.iter().enumerate() {
                if used >= visible_total && typing.is_some() {
                    break;
                }
                let baseline = oy + panel_pad + size * 0.82 + i as f32 * size * lh;
                let remain = visible_total.saturating_sub(used);
                let visible = if remain >= line.chars().count() {
                    None
                } else {
                    Some(remain)
                };
                let mut themed = theme.clone();
                for field in [
                    &mut themed.plain,
                    &mut themed.keyword,
                    &mut themed.string,
                    &mut themed.comment,
                    &mut themed.number,
                    &mut themed.function,
                ] {
                    if let Some(mut c) = parse(field) {
                        c.0[3] = (c.0[3] as f32 * alpha) as u8;
                        *field =
                            format!("#{:02x}{:02x}{:02x}{:02x}", c.0[0], c.0[1], c.0[2], c.0[3]);
                    }
                }
                fonts.draw_code_line(
                    frame,
                    line,
                    ox + panel_pad,
                    baseline,
                    *size,
                    &themed,
                    visible,
                );
                used += line.chars().count();
            }
        }
        Item::Counter {
            at,
            dur,
            from,
            to,
            x,
            y,
            size,
            color,
            prefix,
            suffix,
            decimals,
            ease,
            fade_in,
            fade_out,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let alpha = fade(life, *dur, *fade_in, *fade_out);
            if alpha <= 0.001 {
                return;
            }
            let span = (*dur - (*dur).min(*fade_in + *fade_out)).max(1);
            let t = apply(*ease, life as f32 / span as f32);
            let value = from + (to - from) * t as f64;
            let mut text = crate::text::format_number(value, *decimals);
            if let Some(p) = prefix {
                text = format!("{p}{text}");
            }
            if let Some(s) = suffix {
                text = format!("{text}{s}");
            }
            let color = parse_or(Some(color), Rgba([240, 246, 255, 255])).with_alpha(alpha);
            fonts.draw_block(
                frame,
                &text,
                px(*x, project.width),
                px(*y, project.height),
                *size,
                true,
                color,
                Align::Center,
                None,
                1.2,
            );
        }
        Item::Card {
            at,
            dur,
            x,
            y,
            w,
            h,
            title,
            body,
            accent,
            panel,
            fade_in,
            fade_out,
            drift_y,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let alpha = fade(life, *dur, *fade_in, *fade_out);
            if alpha <= 0.001 {
                return;
            }
            let drift = drift_y * (1.0 - alpha);
            let cx = px(*x, project.width) - px(*w, project.width) / 2.0;
            let cy = px(*y, project.height) - drift - px(*h, project.height) / 2.0;
            let cw = px(*w, project.width);
            let ch = px(*h, project.height);
            let panel_color =
                parse_or(panel.as_deref(), Rgba([16, 24, 44, 255])).with_alpha(alpha * 0.85);
            frame.round_rect(cx, cy, cw, ch, 18.0, panel_color);
            let accent_color =
                parse_or(accent.as_deref(), Rgba([110, 160, 255, 255])).with_alpha(alpha);
            frame.round_rect(cx, cy, 6.0, ch, 3.0, accent_color);
            let title_size = ch * 0.22;
            fonts.draw_block(
                frame,
                title,
                cx + 28.0,
                cy + ch * 0.16,
                title_size,
                true,
                Rgba([235, 242, 252, (alpha * 255.0) as u8]),
                Align::Left,
                Some(cw - 56.0),
                1.15,
            );
            if let Some(body) = body {
                let body_size = ch * 0.14;
                fonts.draw_block(
                    frame,
                    body,
                    cx + 28.0,
                    cy + ch * 0.44,
                    body_size,
                    false,
                    Rgba([150, 170, 200, (alpha * 255.0) as u8]),
                    Align::Left,
                    Some(cw - 56.0),
                    1.3,
                );
            }
        }
        Item::Image {
            at,
            dur,
            src,
            x,
            y,
            w,
            h,
            fit,
            opacity,
            radius,
            fade_in,
            fade_out,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let alpha = fade(life, *dur, *fade_in, *fade_out) * opacity;
            if alpha <= 0.001 {
                return;
            }
            // A broken import degrades to nothing; rendering the rest still wins.
            let Ok(bitmap) = media.image(src) else {
                return;
            };
            let (bw, bh) = (px(*w, project.width), px(*h, project.height));
            frame.draw_bitmap(
                &bitmap,
                px(*x, project.width) - bw / 2.0,
                px(*y, project.height) - bh / 2.0,
                bw,
                bh,
                *fit,
                alpha,
                *radius,
            );
        }
        Item::Video {
            at,
            dur,
            src,
            src_in,
            x,
            y,
            w,
            h,
            fit,
            opacity,
            radius,
            fade_in,
            fade_out,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let alpha = fade(life, *dur, *fade_in, *fade_out) * opacity;
            if alpha <= 0.001 {
                return;
            }
            let source_seconds = (*src_in + life) as f64 / project.fps as f64;
            let Ok(bitmap) = media.video_frame(src, source_seconds) else {
                return;
            };
            let (bw, bh) = (px(*w, project.width), px(*h, project.height));
            frame.draw_bitmap(
                &bitmap,
                px(*x, project.width) - bw / 2.0,
                px(*y, project.height) - bh / 2.0,
                bw,
                bh,
                *fit,
                alpha,
                *radius,
            );
        }
        Item::Shape {
            at,
            dur,
            shape,
            x,
            y,
            w,
            h,
            color,
            radius,
            stroke,
            progress,
            blend,
            fade_in,
            fade_out,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let alpha = fade(life, *dur, *fade_in, *fade_out);
            if alpha <= 0.001 {
                return;
            }
            let c = parse_or(Some(color), Rgba([110, 160, 255, 255])).with_alpha(alpha);
            let cx = px(*x, project.width);
            let cy = px(*y, project.height);
            match shape {
                ShapeKind::Rect => frame.round_rect(
                    cx,
                    cy,
                    px(*w, project.width),
                    px(*h, project.height),
                    *radius,
                    c,
                ),
                ShapeKind::Circle => frame.circle(cx, cy, px(*w, project.width) / 2.0, c, None),
                ShapeKind::Ring => {
                    frame.circle(cx, cy, px(*w, project.width) / 2.0, c, stroke.or(Some(3.0)))
                }
                ShapeKind::Line => {
                    // `progress` lets a line draw itself, which is how motion
                    // reads as intent rather than as a slideshow.
                    let p = progress.clamp(0.0, 1.0);
                    let ex = cx + px(*w, project.width) * p;
                    let ey = cy + px(*h, project.height) * p;
                    let thickness = stroke.unwrap_or(2.0);
                    match blend {
                        Blend::Normal => frame.line(cx, cy, ex, ey, thickness, c),
                        Blend::Add => {
                            let steps = ((ex - cx).abs().max((ey - cy).abs()) as u32).max(1);
                            for s in 0..=steps {
                                let t = s as f32 / steps as f32;
                                let point = (cx + (ex - cx) * t, cy + (ey - cy) * t);
                                frame.add_pixel(point.0 as u32, point.1 as u32, c);
                                frame.add_pixel(point.0 as u32 + 1, point.1 as u32, c);
                            }
                        }
                    }
                    if p > 0.01 && p < 0.999 {
                        frame.glow(ex, ey, thickness * 5.0, c);
                    }
                }
            }
        }
        Item::Bands {
            at,
            dur,
            count,
            angle,
            speed,
            color,
            alpha,
            thickness,
            fade_in,
            fade_out,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let opacity = fade(life, *dur, *fade_in, *fade_out) * alpha;
            if opacity <= 0.001 {
                return;
            }
            let c = parse_or(Some(color), Rgba([120, 170, 255, 255])).with_alpha(opacity);
            let height = project.height as f32;
            let seconds = life as f32 / project.fps as f32;
            let count = (*count).max(1);
            for i in 0..count {
                let base = height * (i as f32 + 1.0) / (count as f32 + 1.0);
                let drift = seconds * speed * if i % 2 == 0 { 1.0 } else { -0.6 };
                frame.band(base + drift, *angle, *thickness, c);
            }
        }
        Item::Grain {
            at,
            dur,
            strength,
            density,
            fade_in,
            fade_out,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let opacity = fade(life, *dur, *fade_in, *fade_out);
            if opacity <= 0.001 {
                return;
            }
            frame.grain(*density, strength * opacity, frame_index.wrapping_add(1));
        }
        Item::Path {
            at,
            dur,
            points,
            smooth,
            closed,
            fill,
            color,
            stroke,
            progress,
            rotate,
            scale,
            blend,
            fade_in,
            fade_out,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let alpha = fade(life, *dur, *fade_in, *fade_out);
            if alpha <= 0.001 {
                return;
            }
            let to_pixels = |list: &[[f32; 2]]| -> Vec<[f32; 2]> {
                list.iter().map(|p| [p[0] * w, p[1] * h]).collect()
            };
            let mut shape = if *smooth {
                smooth_polyline(points, *closed, 12)
            } else {
                points.clone()
            };
            if *closed && !*smooth && !shape.is_empty() {
                shape.push(shape[0]);
            }
            // Per-item transform: scale, then rotate, around the centroid.
            if (*scale - 1.0).abs() > 0.001 || rotate.abs() > 0.001 {
                let mut px_points = to_pixels(&shape);
                let count = px_points.len().max(1) as f32;
                let cx = px_points.iter().map(|p| p[0]).sum::<f32>() / count;
                let cy = px_points.iter().map(|p| p[1]).sum::<f32>() / count;
                let (sin, cos) = rotate.to_radians().sin_cos();
                for point in &mut px_points {
                    let dx = (point[0] - cx) * scale;
                    let dy = (point[1] - cy) * scale;
                    point[0] = cx + dx * cos - dy * sin;
                    point[1] = cy + dx * sin + dy * cos;
                }
                shape = px_points.iter().map(|p| [p[0] / w, p[1] / h]).collect();
            }
            let pixels = to_pixels(&shape);
            let additive = *blend == Blend::Add;
            if let Some(fill_color) = fill {
                let c = parse_or(Some(fill_color), Rgba([20, 40, 90, 255])).with_alpha(alpha);
                frame.fill_polygon(&pixels, c, additive);
            }
            if let Some(width) = stroke {
                let c = parse_or(Some(color), Rgba([110, 160, 255, 255])).with_alpha(alpha);
                frame.stroke_polyline(&pixels, *width, c, *progress, additive);
                // A moving tip reads as a pen rather than a static outline.
                if *progress > 0.01
                    && *progress < 0.999
                    && let Some(tip) = pixels.get((pixels.len() as f32 * progress) as usize)
                {
                    frame.glow(tip[0], tip[1], width * 4.0, c);
                }
            }
        }
        Item::Footnote {
            at,
            dur,
            text,
            size,
            x,
            y,
            align,
            color,
            fade_in,
            fade_out,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let alpha = fade(life, *dur, *fade_in, *fade_out) * 0.9;
            if alpha <= 0.001 {
                return;
            }
            let c = parse_or(Some(color), Rgba([93, 111, 140, 255])).with_alpha(alpha);
            fonts.draw_block(
                frame,
                text,
                px(*x, project.width),
                px(*y, project.height),
                *size,
                false,
                c,
                *align,
                Some(0.6 * project.width as f32),
                1.2,
            );
        }
        Item::Progress {
            at,
            dur,
            track,
            fill,
            y,
        } => {
            if local < *at || local >= *at + *dur {
                return;
            }
            let life = local - *at;
            let alpha = fade(life, *dur, 6, 6);
            if alpha <= 0.001 {
                return;
            }
            let track = parse_or(track.as_deref(), Rgba([40, 52, 78, 255])).with_alpha(alpha * 0.7);
            let fill = parse_or(fill.as_deref(), Rgba([110, 160, 255, 255])).with_alpha(alpha);
            let bar_y = px(y.unwrap_or(0.965), project.height);
            let margin = 0.08 * project.width as f32;
            let full = project.width as f32 - margin * 2.0;
            frame.round_rect(margin, bar_y, full, 4.0, 2.0, track);
            let t = frame_index as f32 / project.duration_frames as f32;
            frame.round_rect(margin, bar_y, full * t, 4.0, 2.0, fill);
        }
    }
}

/// Deterministic jitter helper kept for future item kinds.
#[allow(dead_code)]
fn jitter(seed: u32) -> f32 {
    (hash(seed) as f32 / u32::MAX as f32) * 2.0 - 1.0
}

#[cfg(test)]
mod tests {
    /// Renders a tiny film end to end: rasterize, synthesize audio, encode MP4.
    #[test]
    fn renders_minimal_film() {
        let project = serde_json::json!({
            "width": 320,
            "height": 240,
            "fps": 15,
            "durationFrames": 30,
            "scenes": [{
                "start": 0,
                "duration": 30,
                "background": { "kind": "v-gradient", "colors": ["#05070f", "#0b1226"] },
                "items": [
                    { "kind": "text", "at": 0, "dur": 30, "content": "OpenCut", "size": 48.0,
                      "bold": true, "color": "#e6eefa", "x": 0.5, "y": 0.4, "align": "center",
                      "fadeIn": 5, "fadeOut": 5 },
                    { "kind": "counter", "at": 0, "dur": 30, "from": 0.0, "to": 1234.0, "x": 0.5,
                      "y": 0.7, "size": 36.0, "color": "#7aa2ff", "decimals": 0, "ease": "out-cubic",
                      "fadeIn": 5, "fadeOut": 5 },
                    { "kind": "progress", "at": 0, "dur": 30 }
                ]
            }],
            "audio": {
                "bgm": { "volume": 0.2, "mood": "pad" },
                "sfx": [{ "at": 5, "kind": "whoosh", "volume": 0.4 }]
            }
        });
        let out = std::env::temp_dir().join("opencut-smoke.mp4");
        let stats =
            super::render_project(&project.to_string(), &out, &mut |_, _| {}).expect("render");
        assert_eq!(stats.frames, 30);
        assert!(stats.audio);
        let meta = std::fs::metadata(&out).expect("output exists");
        assert!(meta.len() > 1_000, "mp4 too small: {}", meta.len());
    }

    #[test]
    fn renders_without_audio_track() {
        let project = serde_json::json!({
            "width": 320, "height": 240, "fps": 15, "durationFrames": 15,
            "scenes": [{ "start": 0, "duration": 15,
                "background": { "kind": "solid", "color": "#101828" },
                "items": [] }],
            "audio": null
        });
        let out = std::env::temp_dir().join("opencut-video-only.mp4");
        let stats =
            super::render_project(&project.to_string(), &out, &mut |_, _| {}).expect("render");
        assert!(!stats.audio);
        assert!(std::fs::metadata(&out).unwrap().len() > 500);
    }

    /// Writes a PNG with our own encoder, imports it back through WIC and
    /// checks that the pixels survive the round trip.
    #[test]
    fn imports_image_roundtrip() {
        let dir = std::env::temp_dir().join("opencut-media-tests");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("fixture.png");
        let (width, height) = (64u32, 48u32);
        let mut pixels = Vec::with_capacity((width * height * 4) as usize);
        for y in 0..height {
            for x in 0..width {
                pixels.extend_from_slice(&[(x * 4) as u8, (y * 5) as u8, 0x40, 0xFF]);
            }
        }
        crate::png::write_png(&path, width, height, &pixels).expect("write png");

        let mut media = crate::media::MediaLibrary::new();
        let bitmap = media.image(path.to_str().unwrap()).expect("decode png");
        assert_eq!((bitmap.width, bitmap.height), (width, height));
        // Row 1, column 3 should come back as encoded (allow 1 bit of slack).
        let i = (width + 3) as usize * 4;
        assert!(
            (i32::from(bitmap.rgba[i]) - 12).abs() <= 2,
            "red {}",
            bitmap.rgba[i]
        );
        assert!(
            (i32::from(bitmap.rgba[i + 1]) - 5).abs() <= 2,
            "green {}",
            bitmap.rgba[i + 1]
        );
        assert!(
            (i32::from(bitmap.rgba[i + 2]) - 0x40).abs() <= 2,
            "blue {}",
            bitmap.rgba[i + 2]
        );
    }

    /// Renders a clip with this pipeline, imports it as media, and mixes an
    /// audio file generated by our own WAV writer.
    #[test]
    fn imports_video_and_audio() {
        let dir = std::env::temp_dir().join("opencut-media-tests");
        std::fs::create_dir_all(&dir).unwrap();

        // 1. Produce a source clip with OpenCut itself.
        let source = dir.join("source.mp4");
        let clip = serde_json::json!({
            "width": 160, "height": 120, "fps": 15, "durationFrames": 15,
            "scenes": [{ "start": 0, "duration": 15,
                "background": { "kind": "solid", "color": "#c02030" }, "items": [] }],
            "audio": null
        });
        super::render_project(&clip.to_string(), &source, &mut |_, _| {}).expect("source clip");

        // 1b. Decode the clip back and check the pixels, so a silent import
        // failure cannot pass as a green test.
        let mut library = crate::media::MediaLibrary::new();
        let frame = library
            .video_frame(source.to_str().unwrap(), 0.1)
            .expect("decode video frame");
        assert_eq!((frame.width, frame.height), (160, 120));
        assert!(
            frame.rgba[0] > 120 && frame.rgba[1] < 100,
            "expected the red source, got {:?}",
            &frame.rgba[0..4]
        );

        // 2. Write a short PCM16 WAV with our own writer.
        let wav = dir.join("tone.wav");
        let mut samples = Vec::new();
        for i in 0..crate::audio::SAMPLE_RATE as usize / 2 {
            let t = i as f64 / crate::audio::SAMPLE_RATE as f64;
            let value = ((t * 440.0 * std::f64::consts::TAU).sin() * 0.4 * i16::MAX as f64) as i16;
            samples.push(value);
            samples.push(value);
        }
        crate::audio::write_wav(wav.to_str().unwrap(), &samples).expect("wav");

        // 3. Import both in a film.
        let film = serde_json::json!({
            "width": 320, "height": 240, "fps": 15, "durationFrames": 30,
            "scenes": [{ "start": 0, "duration": 30,
                "background": { "kind": "solid", "color": "#05070f" },
                "items": [
                    { "kind": "video", "at": 0, "dur": 30, "src": source.to_str().unwrap(),
                      "x": 0.5, "y": 0.5, "w": 0.6, "h": 0.6, "fit": "contain" },
                    { "kind": "image", "at": 0, "dur": 30, "src": dir.join("fixture.png").to_str().unwrap(),
                      "x": 0.82, "y": 0.18, "w": 0.14, "h": 0.14, "fit": "cover", "radius": 12.0 }
                ]
            }],
            "audio": { "clips": [{ "src": wav.to_str().unwrap(), "at": 0, "volume": 0.8 }] }
        });
        let out = dir.join("imported.mp4");
        let stats =
            super::render_project(&film.to_string(), &out, &mut |_, _| {}).expect("render imports");
        assert_eq!(stats.frames, 30);
        assert!(stats.audio);
        assert!(std::fs::metadata(&out).unwrap().len() > 2_000);
    }
}
