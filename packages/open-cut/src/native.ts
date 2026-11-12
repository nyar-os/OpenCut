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
}

export interface NativeBinding {
    version(): string;
    renderProject(options: { project: string; out: string }): RenderResult;
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
