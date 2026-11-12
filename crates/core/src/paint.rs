//! Software rasterizer: one RGBA8 framebuffer plus the primitives the scene
//! vocabulary needs. Everything here is plain integer/floating math; there is
//! no GPU and no external imaging library.

use crate::color::Rgba;

/// An RGBA8 framebuffer owned by the renderer.
pub struct Frame {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u8>,
}

impl Frame {
    #[must_use]
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            width,
            height,
            pixels: vec![0; (width as usize) * (height as usize) * 4],
        }
    }

    #[inline]
    fn set(&mut self, x: u32, y: u32, c: Rgba) {
        let i = ((y * self.width + x) as usize) * 4;
        self.pixels[i] = c.0[0];
        self.pixels[i + 1] = c.0[1];
        self.pixels[i + 2] = c.0[2];
        self.pixels[i + 3] = c.0[3];
    }

    #[inline]
    pub fn blend(&mut self, x: u32, y: u32, c: Rgba) {
        let i = ((y * self.width + x) as usize) * 4;
        let a = c.0[3] as u32;
        if a >= 255 {
            self.set(x, y, c);
            return;
        }
        if a == 0 {
            return;
        }
        let inv = 255 - a;
        for k in 0..4 {
            let dst = self.pixels[i + k] as u32;
            self.pixels[i + k] = ((c.0[k] as u32 * a + dst * inv) / 255) as u8;
        }
    }

    #[inline]
    fn add(&mut self, x: u32, y: u32, c: Rgba) {
        let i = ((y * self.width + x) as usize) * 4;
        for k in 0..3 {
            let v = self.pixels[i + k] as u32 + (c.0[k] as u32 * c.0[3] as u32 / 255);
            self.pixels[i + k] = v.min(255) as u8;
        }
    }

    /// Paints a solid color everywhere.
    pub fn fill(&mut self, c: Rgba) {
        for chunk in self.pixels.chunks_mut(4) {
            chunk.copy_from_slice(&c.0);
        }
    }

    /// Paints a vertical gradient through the given color stops (evenly spaced).
    pub fn v_gradient(&mut self, stops: &[Rgba]) {
        if stops.is_empty() {
            return;
        }
        if stops.len() == 1 {
            self.fill(stops[0]);
            return;
        }
        let h = self.height;
        let w = self.width;
        let segments = stops.len() - 1;
        for y in 0..h {
            let t = (y as f32 / (h - 1).max(1) as f32) * segments as f32;
            let seg = (t as usize).min(segments - 1);
            let local = t - seg as f32;
            let c = stops[seg].lerp(stops[seg + 1], local);
            let row = (y as usize) * (w as usize) * 4;
            for px in self.pixels[row..row + (w as usize) * 4].chunks_mut(4) {
                px.copy_from_slice(&c.0);
            }
        }
    }

    /// Paints a radial gradient from `center` color to `edge` color.
    pub fn radial(&mut self, center: Rgba, edge: Rgba) {
        let cx = self.width as f32 / 2.0;
        let cy = self.height as f32 / 2.0;
        let max_r = (cx * cx + cy * cy).sqrt();
        for y in 0..self.height {
            for x in 0..self.width {
                let dx = x as f32 - cx;
                let dy = y as f32 - cy;
                let t = (dx * dx + dy * dy).sqrt() / max_r;
                let c = center.lerp(edge, t);
                self.set(x, y, c);
            }
        }
    }

    /// Source-over rectangle. Coordinates are clamped to the frame.
    pub fn rect(&mut self, x: f32, y: f32, w: f32, h: f32, c: Rgba) {
        let x0 = x.max(0.0) as u32;
        let y0 = y.max(0.0) as u32;
        let x1 = (x + w).min(self.width as f32) as u32;
        let y1 = (y + h).min(self.height as f32) as u32;
        if x0 >= x1 || y0 >= y1 {
            return;
        }
        for py in y0..y1 {
            for px in x0..x1 {
                self.blend(px, py, c);
            }
        }
    }

    /// Rounded rectangle with a corner radius in pixels.
    pub fn round_rect(&mut self, x: f32, y: f32, w: f32, h: f32, radius: f32, c: Rgba) {
        if radius <= 0.01 {
            self.rect(x, y, w, h, c);
            return;
        }
        let r = radius.min(w / 2.0).min(h / 2.0);
        let x0 = x.max(0.0) as u32;
        let y0 = y.max(0.0) as u32;
        let x1 = (x + w).min(self.width as f32) as u32;
        let y1 = (y + h).min(self.height as f32) as u32;
        for py in y0..y1 {
            for px in x0..x1 {
                let fx = px as f32;
                let fy = py as f32;
                let cx = if fx < x + r {
                    x + r
                } else if fx > x + w - r {
                    x + w - r
                } else {
                    fx
                };
                let cy = if fy < y + r {
                    y + r
                } else if fy > y + h - r {
                    y + h - r
                } else {
                    fy
                };
                let dx = fx - cx;
                let dy = fy - cy;
                if dx * dx + dy * dy <= r * r {
                    self.blend(px, py, c);
                }
            }
        }
    }

    /// Ring or disc.
    pub fn circle(&mut self, cx: f32, cy: f32, radius: f32, c: Rgba, stroke: Option<f32>) {
        let r = radius;
        let x0 = (cx - r).max(0.0) as u32;
        let y0 = (cy - r).max(0.0) as u32;
        let x1 = (cx + r).min(self.width as f32 - 1.0) as u32;
        let y1 = (cy + r).min(self.height as f32 - 1.0) as u32;
        let inner = stroke.map(|s| (r - s).max(0.0));
        for py in y0..=y1 {
            for px in x0..=x1 {
                let dx = px as f32 - cx;
                let dy = py as f32 - cy;
                let d = (dx * dx + dy * dy).sqrt();
                if d <= r && inner.is_none_or(|ri| d >= ri) {
                    self.blend(px, py, c);
                }
            }
        }
    }

    /// Straight line with thickness.
    pub fn line(&mut self, x0: f32, y0: f32, x1: f32, y1: f32, thickness: f32, c: Rgba) {
        let dx = x1 - x0;
        let dy = y1 - y0;
        let len = (dx * dx + dy * dy).max(0.001);
        let steps = (len * 2.0) as u32;
        let half = thickness / 2.0;
        for s in 0..=steps {
            let t = s as f32 / steps as f32;
            let px = x0 + dx * t;
            let py = y0 + dy * t;
            self.circle(px, py, half, c, None);
        }
    }

    /// Additive soft glow dot for star fields and highlights.
    pub fn glow(&mut self, cx: f32, cy: f32, radius: f32, c: Rgba) {
        let x0 = (cx - radius).max(0.0) as u32;
        let y0 = (cy - radius).max(0.0) as u32;
        let x1 = (cx + radius).min(self.width as f32 - 1.0) as u32;
        let y1 = (cy + radius).min(self.height as f32 - 1.0) as u32;
        for py in y0..=y1 {
            for px in x0..=x1 {
                let dx = px as f32 - cx;
                let dy = py as f32 - cy;
                let d = (dx * dx + dy * dy).sqrt() / radius;
                if d >= 1.0 {
                    continue;
                }
                let falloff = (1.0 - d) * (1.0 - d);
                let a = c.0[3] as f32 * falloff / 255.0;
                self.add(px, py, Rgba([c.0[0], c.0[1], c.0[2], (a * 255.0) as u8]));
            }
        }
    }

    /// Deterministic star field: hash-based positions, sine twinkle, slow drift.
    pub fn starfield(
        &mut self,
        count: u32,
        tint: Rgba,
        drift_px_per_sec: f32,
        twinkle: f32,
        seconds: f32,
    ) {
        for i in 0..count {
            let h = hash(i);
            let base_x = (h & 0xffff) as f32 / 65535.0;
            let base_y = ((h >> 16) & 0xffff) as f32 / 65535.0;
            let phase = ((h >> 3) & 255) as f32 / 255.0 * std::f32::consts::PI * 2.0;
            let speed = 0.4 + ((h >> 11) & 63) as f32 / 63.0 * 1.4;
            let size = 1.0 + ((h >> 20) & 3) as f32;
            let x = (base_x * self.width as f32 + drift_px_per_sec * seconds)
                .rem_euclid(self.width as f32);
            let y = base_y * self.height as f32;
            let brightness = (1.0 - twinkle
                + twinkle * (0.5 + 0.5 * (seconds * speed + phase).sin()))
            .clamp(0.0, 1.0);
            let c = Rgba([tint.0[0], tint.0[1], tint.0[2], (brightness * 230.0) as u8]);
            if size > 2.0 {
                self.glow(x, y, size * 3.0, c.with_alpha(brightness * 60.0));
            }
            self.rect(x, y, size, size, c);
        }
    }

    /// Darkens the frame edges; `vignette` holds one alpha byte per pixel.
    pub fn apply_vignette(&mut self, factor: &[u8]) {
        let mut i = 0;
        for y in 0..self.height {
            for x in 0..self.width {
                let v = factor[i] as u32;
                if v != 0 {
                    let p = i * 4;
                    self.pixels[p] = (self.pixels[p] as u32 * (255 - v) / 255) as u8;
                    self.pixels[p + 1] = (self.pixels[p + 1] as u32 * (255 - v) / 255) as u8;
                    self.pixels[p + 2] = (self.pixels[p + 2] as u32 * (255 - v) / 255) as u8;
                    let _ = (x, y);
                }
                i += 1;
            }
        }
    }

    /// Converts RGBA8 to NV12 (BT.601, full-range) for the encoder.
    #[must_use]
    pub fn to_nv12(&self) -> Vec<u8> {
        let w = self.width as usize;
        let h = self.height as usize;
        let mut out = vec![0u8; w * h + w * h / 2];
        let mut di = 0;
        for y in 0..h {
            let row = y * w * 4;
            for x in 0..w {
                let p = row + x * 4;
                let r = self.pixels[p] as f32 / 255.0;
                let g = self.pixels[p + 1] as f32 / 255.0;
                let b = self.pixels[p + 2] as f32 / 255.0;
                let yy = 0.299 * r + 0.587 * g + 0.114 * b;
                out[di] = (yy * 255.0).round().clamp(0.0, 255.0) as u8;
                di += 1;
            }
        }
        let mut uv = w * h;
        for by in (0..h).step_by(2) {
            for bx in (0..w).step_by(2) {
                let mut acc_u = 0.0f32;
                let mut acc_v = 0.0f32;
                let mut n = 0.0f32;
                for dy in 0..2 {
                    for dx in 0..2 {
                        let p = (by + dy) * w * 4 + (bx + dx) * 4;
                        let r = self.pixels[p] as f32 / 255.0;
                        let g = self.pixels[p + 1] as f32 / 255.0;
                        let b = self.pixels[p + 2] as f32 / 255.0;
                        acc_u += -0.168736 * r - 0.331264 * g + 0.5 * b;
                        acc_v += 0.5 * r - 0.418688 * g - 0.081312 * b;
                        n += 1.0;
                    }
                }
                out[uv] = ((acc_u / n) * 255.0 + 128.0).round().clamp(0.0, 255.0) as u8;
                out[uv + 1] = ((acc_v / n) * 255.0 + 128.0).round().clamp(0.0, 255.0) as u8;
                uv += 2;
            }
        }
        out
    }
}

/// Cheap 32-bit integer hash for deterministic randomness.
#[must_use]
pub fn hash(mut x: u32) -> u32 {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    x.wrapping_mul(0x9e37_79b9)
}

/// Builds the vignette factor map once per resolution.
#[must_use]
pub fn build_vignette(width: u32, height: u32, strength: f32) -> Vec<u8> {
    let cx = width as f32 / 2.0;
    let cy = height as f32 / 2.0;
    let max_r = (cx * cx + cy * cy).sqrt();
    let mut map = vec![0u8; (width as usize) * (height as usize)];
    let mut i = 0;
    for y in 0..height {
        for x in 0..width {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let t = (dx * dx + dy * dy).sqrt() / max_r;
            let v = (t - 0.45).max(0.0) / 0.55 * strength;
            map[i] = (v.clamp(0.0, 1.0) * 180.0) as u8;
            i += 1;
        }
    }
    map
}
