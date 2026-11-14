//! Bakes the source revision into the binary so a shipped `.node` can name the
//! commit it was built from. The revision is read from the checkout that
//! contains this crate; a packaged build without one reports `unknown` instead
//! of inventing a value.

use std::process::Command;

fn git(args: &[&str]) -> Option<String> {
    let output = Command::new("git").args(args).current_dir(env!("CARGO_MANIFEST_DIR")).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8(output.stdout).ok()?.trim().to_string();
    (!text.is_empty()).then_some(text)
}

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    // The revision and the dependency set both change what this binary contains,
    // so a new commit or a bumped upstream pin must refresh the provenance.
    println!("cargo:rerun-if-changed=../../Cargo.toml");
    println!("cargo:rerun-if-changed=../../Cargo.lock");
    let revision = git(&["rev-parse", "HEAD"]).unwrap_or_else(|| "unknown".to_string());
    let dirty = git(&["status", "--porcelain"]).is_some_and(|status| !status.is_empty());
    println!("cargo:rustc-env=OPEN_CUT_SOURCE_REV={revision}");
    println!("cargo:rustc-env=OPEN_CUT_SOURCE_DIRTY={dirty}");
}
