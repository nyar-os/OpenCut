//! OpenCut render core.
//!
//! A film is data: the scene IR is compiled frame by frame by a software
//! rasterizer, the audio bed is synthesized in-process, and the result is
//! encoded to MP4 through the Windows Media Foundation. No external media
//! toolchain participates in the pipeline.

// Item painters and text layout take the scene fields directly; bundling them
// into structs at every call site would add indirection without clarity.
#![allow(clippy::too_many_arguments)]

pub mod audio;
pub mod color;
pub mod ease;
pub mod encode;
pub mod error;
pub mod media;
pub mod paint;
pub mod png;
pub mod render;
pub mod scene;
pub mod text;

pub use error::Error;
pub use render::{RenderStats, render_project};
