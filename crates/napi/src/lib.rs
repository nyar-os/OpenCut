//! Node-API capability surface for OpenCut.
//!
//! The N-API module is the only implementation path used by the CLI and the
//! TypeScript authoring surface. It moves scene data between JavaScript and
//! the render core and contains no platform `cfg` branches.

#![deny(missing_docs)]

use opencut_core::render::RenderStats;
use serde_json::json;
use wae::{CallContext, Env, Error, JsValue, Result, function, register_module};

/// Library version used by `@wae/open-cut` to verify the native binary.
#[function]
fn version(ctx: CallContext) -> Result<JsValue> {
    ctx.env().string(env!("CARGO_PKG_VERSION"))
}

/// Render a project JSON string into an MP4 file.
///
/// Argument: `{ project: string, out: string }`. Returns render statistics.
/// Rendering is synchronous on the calling thread and logs progress to stdout.
#[function(js_name = "renderProject")]
fn render_project(ctx: CallContext) -> Result<JsValue> {
    let arg = ctx
        .args()
        .first()
        .copied()
        .ok_or_else(|| Error::new("renderProject requires an options object"))?;
    let project = arg.get_named("project")?.as_string()?;
    let out = arg.get_named("out")?.as_string()?;
    let path = std::path::Path::new(&out);
    if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
        std::fs::create_dir_all(parent)
            .map_err(|e| Error::new(format!("cannot create output directory: {e}")))?;
    }
    let stats = opencut_core::render::render_project(&project, path, &mut |done, total| {
        if done == total || done % 30 == 0 {
            println!("opencut: frame {done}/{total}");
        }
    })
    .map_err(core_error)?;
    json_to_js(ctx.env(), &to_json(&stats))
}

fn core_error(error: opencut_core::Error) -> Error {
    Error::new(format!("{}: {}", error.code(), error))
}

fn to_json(stats: &RenderStats) -> serde_json::Value {
    json!({
        "frames": stats.frames,
        "width": stats.width,
        "height": stats.height,
        "fps": stats.fps,
        "seconds": stats.seconds,
        "out": stats.out,
        "bytes": stats.bytes,
        "backend": stats.backend,
        "audio": stats.audio,
    })
}

fn json_to_js(env: Env, value: &serde_json::Value) -> Result<JsValue> {
    match value {
        serde_json::Value::Null => env.null(),
        serde_json::Value::Bool(inner) => env.boolean(*inner),
        serde_json::Value::Number(number) => {
            if let Some(integer) = number.as_i64() {
                env.int64(integer)
            } else {
                env.double(number.as_f64().unwrap_or(0.0))
            }
        }
        serde_json::Value::String(text) => env.string(text),
        serde_json::Value::Array(items) => {
            let array = env.array_with_length(items.len())?;
            for (index, item) in items.iter().enumerate() {
                array.set_element(index as u32, json_to_js(env, item)?)?;
            }
            Ok(array)
        }
        serde_json::Value::Object(map) => {
            let object = env.object()?;
            for (key, item) in map {
                object.set_named(key, json_to_js(env, item)?)?;
            }
            Ok(object)
        }
    }
}

register_module![version, render_project];
