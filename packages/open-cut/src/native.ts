/**
 * Native binding loader for `@wae/open-cut`.
 *
 * The N-API module is the only implementation path: CLI and authoring
 * surface both call these functions. Platform packages are optional
 * dependencies; a missing binary produces an actionable error instead of a
 * silent fallback.
 */
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export interface RenderResult {
    frames: number;
    width: number;
    height: number;
    fps: number;
    seconds: number;
    out: string;
    bytes: number;
    backend: string;
    audio: boolean;
    /** Half-open frame range written, in project frames. */
    range: [number, number];
    /** Font files the render loaded, in role order. */
    fonts: string[];
    /** FNV-1a hash of the project JSON that produced the file. */
    projectHash: string;
    /** Declared optional resources that stayed empty. */
    optionalMissing: string[];
}

export interface RenderOptions {
    /** First project frame to write; frames are renumbered from zero. */
    startFrame?: number;
    /** Exclusive end frame. Required when `startFrame` is set. */
    endFrame?: number;
    /** Path polled between frames: creating it cancels the run. */
    cancelFile?: string;
}

export interface BuildInfo {
    version: string;
    sourceRev: string;
    dirty: boolean;
    profile: string;
}

export interface PreviewResult {
    frame: number;
    width: number;
    height: number;
    /** Font files the preview loaded, in role order. */
    fonts: string[];
    projectHash: string;
}

export interface NativeBinding {
    version(): string;
    build(): BuildInfo;
    renderProject(options: { project: string; out: string } & RenderOptions): RenderResult;
    previewFrame(options: { project: string; frame: number; out: string }): PreviewResult;
}

const PLATFORM_PACKAGE = '@wae/open-cut-win32-x64';

/**
 * Specifiers to try: optional env override, the platform package (via
 * `package.json#main`), then the sibling checkout package directory.
 */
export function nativeCandidates(): string[] {
    const override = process.env.OPEN_CUT_NATIVE;
    const here = path.dirname(fileURLToPath(import.meta.url));
    const localPackage = path.resolve(here, '..', '..', 'open-cut-win32-x64');
    const packages = [PLATFORM_PACKAGE, localPackage];
    return override ? [override, ...packages] : packages;
}

function load(): NativeBinding {
    const errors: string[] = [];
    for (const candidate of nativeCandidates()) {
        try {
            return require(candidate) as NativeBinding;
        }
        catch (error) {
            errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    throw new Error(
        `OpenCut native binding is not available for ${os.platform()}-${os.arch()}.\n` +
            `Set OPEN_CUT_NATIVE to a built .node file, or install ${PLATFORM_PACKAGE}.\n` +
            `Tried:\n${errors.map((line) => `  - ${line}`).join('\n')}`,
    );
}

export const native = load();
