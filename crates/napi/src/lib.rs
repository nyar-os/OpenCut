//! Node-API capability surface for OpenCut.
//!
//! The N-API module is the only implementation path used by the CLI and the
//! TypeScript authoring surface. It moves scene data between JavaScript and
//! the render core and contains no platform `cfg` branches.

#![deny(missing_docs)]

use wae::{CallContext, JsValue, Result, function, register_module};

/// Library version used by `@wae/open-cut` to verify the native binary.
#[function]
fn version(ctx: CallContext) -> Result<JsValue> {
    ctx.env().string(env!("CARGO_PKG_VERSION"))
}

register_module![version];
