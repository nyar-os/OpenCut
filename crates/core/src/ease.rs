//! Easing curves and the shared fade envelope.

use crate::scene::Ease;

/// Maps a normalized progress 0..=1 through the named curve.
#[must_use]
pub fn apply(ease: Ease, t: f32) -> f32 {
    let t = t.clamp(0.0, 1.0);
    match ease {
        Ease::Linear => t,
        Ease::InOutCubic => {
            if t < 0.5 {
                4.0 * t * t * t
            } else {
                1.0 - (-2.0 * t + 2.0).powi(3) / 2.0
            }
        }
        Ease::OutCubic => 1.0 - (1.0 - t).powi(3),
        Ease::OutQuint => 1.0 - (1.0 - t).powi(5),
        Ease::InOutSine => (1.0 - (std::f32::consts::PI * t).cos()) / 2.0,
    }
}

/// Alpha envelope for an element living `dur` frames with fades at both ends.
#[must_use]
pub fn fade(local: u32, dur: u32, fade_in: u32, fade_out: u32) -> f32 {
    if dur == 0 {
        return 0.0;
    }
    let fade_in = fade_in.min(dur / 2 + 1);
    let fade_out = fade_out.min(dur / 2 + 1);
    if local < fade_in {
        apply(Ease::OutCubic, local as f32 / (fade_in.max(1)) as f32)
    } else if local + fade_out > dur {
        let remain = dur - local;
        apply(Ease::OutCubic, remain as f32 / (fade_out.max(1)) as f32)
    } else {
        1.0
    }
}
