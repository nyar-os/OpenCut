#!/usr/bin/env node
/**
 * OpenCut CLI — compile a film script into an MP4.
 *
 * Usage:
 *   open-cut render <film.mjs|film.ts> [--out file.mp4] [--from s] [--to s] [--scene id] [--cancel-file path] [--json]
 *   open-cut verify <film.mjs|film.ts> --out file.mp4 [--json]
 *   open-cut preview <film.mjs|film.ts> --frame N --out file.png [--json]
 *   open-cut build [--json]
 *   open-cut version
 *
 * The film module must default-export a `Film` instance (or an object with a
 * `film` export). `--from`/`--to` export an interval in seconds (frames are
 * renumbered from zero). `--cancel-file` is polled between frames: creating
 * that file stops the run without touching the previous output.
 * Exit codes: 0 success, 1 runtime failure, 2 usage error.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Film } from './dsl.js';
import { nativeBuild, nativeVersion } from './index.js';
import type { RenderResult } from './index.js';

function fail(message: string, code: number): never {
    console.error(`open-cut: ${message}`);
    process.exit(code);
}

function flag(args: string[], name: string): string | undefined {
    const index = args.indexOf(name);
    if (index < 0) {
        return undefined;
    }
    const value = args[index + 1];
    if (value === undefined) {
        fail(`${name} requires a value`, 2);
    }
    return value;
}

const args = process.argv.slice(2);
const command = args[0];

if (command === 'version' || command === undefined) {
    console.log(command === undefined ? 'usage: open-cut render <film> [--out file.mp4] | open-cut verify <film> --out file.mp4 | open-cut build | open-cut version' : nativeVersion());
    process.exit(command === undefined ? 2 : 0);
}

if (command === 'build') {
    const build = nativeBuild();
    if (args.includes('--json')) {
        console.log(JSON.stringify(build, null, 2));
    }
    else {
        console.log(`${build.version} ${build.sourceRev}${build.dirty ? ' (dirty)' : ''} [${build.profile}]`);
    }
    process.exit(0);
}

if (command === 'preview') {
    const script = args[1];
    if (!script) {
        fail('preview requires a film script path', 2);
    }
    const frameArg = flag(args, '--frame');
    const outArg = flag(args, '--out');
    if (frameArg === undefined || outArg === undefined) {
        fail('preview requires --frame <index> and --out <file.png>', 2);
    }
    const module = await import(pathToFileURL(path.resolve(script)).href);
    const film: unknown = module.default ?? module.film;
    if (!(film instanceof Film)) {
        fail('the film module must default-export a Film instance', 2);
    }
    const frame = Math.round(Number(frameArg));
    try {
        const stats = film.preview(frame, path.resolve(outArg));
        if (args.includes('--json')) {
            console.log(JSON.stringify(stats, null, 2));
            process.exit(0);
        }
        console.log(`frame ${stats.frame} -> ${outArg} [${stats.width}x${stats.height}, project ${stats.projectHash}]`);
        console.log(`fonts: ${stats.fonts.join(', ')}`);
    }
    catch (error) {
        fail(error instanceof Error ? error.message : String(error), 1);
    }
    process.exit(0);
}

if (command === 'verify') {
    const script = args[1];
    if (!script) {
        fail('verify requires a film script path', 2);
    }
    const outArg = flag(args, '--out');
    if (outArg === undefined) {
        fail('verify requires --out <file.mp4>', 2);
    }
    const module = await import(pathToFileURL(path.resolve(script)).href);
    const film: unknown = module.default ?? module.film;
    if (!(film instanceof Film)) {
        fail('the film module must default-export a Film instance', 2);
    }
    const stats = (() => {
        try {
            return film.render(path.resolve(outArg));
        }
        catch (error) {
            fail(error instanceof Error ? error.message : String(error), 1);
        }
    })();
    const checks = verifyStats(stats);
    const ok = checks.every((check) => check.ok);
    if (args.includes('--json')) {
        console.log(JSON.stringify({ ok, checks, stats }, null, 2));
    }
    else {
        for (const check of checks) {
            console.log(`${check.ok ? 'ok  ' : 'FAIL'} ${check.name}: ${check.detail}`);
        }
    }
    process.exit(ok ? 0 : 1);
}

if (command !== 'render') {
    fail(`unknown command ${command}`, 2);
}

const script = args[1];
if (!script) {
    fail('render requires a film script path', 2);
}
const out = path.resolve(flag(args, '--out') ?? path.join(path.dirname(path.resolve(script)), 'film.mp4'));

const module = await import(pathToFileURL(path.resolve(script)).href);
const film: unknown = module.default ?? module.film;
if (!(film instanceof Film)) {
    fail('the film module must default-export a Film instance', 2);
}

const from = flag(args, '--from');
const to = flag(args, '--to');
if ((from === undefined) !== (to === undefined)) {
    fail('--from and --to must be given together', 2);
}
const sceneId = flag(args, '--scene');
if (sceneId !== undefined && from !== undefined) {
    fail('--scene cannot be combined with --from/--to', 2);
}
let startFrame = from === undefined ? undefined : Math.round(Number(from) * film.fps);
let endFrame = to === undefined ? undefined : Math.round(Number(to) * film.fps);
if (sceneId !== undefined) {
    try {
        ([startFrame, endFrame] = film.sceneRange(sceneId));
    }
    catch (error) {
        fail(error instanceof Error ? error.message : String(error), 2);
    }
}

const stats = (() => {
    try {
        return film.render(out, { startFrame, endFrame, cancelFile: flag(args, '--cancel-file') });
    }
    catch (error) {
        // The core reports stable codes (`cancelled`, `media`, `invalid_scene`, …);
        // surface the message instead of a bare stack trace.
        fail(error instanceof Error ? error.message : String(error), 1);
    }
})();
if (args.includes('--json')) {
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
}
console.log(
    `rendered frames ${stats.range[0]}..${stats.range[1]} (${stats.frames} frames, ${(stats.frames / stats.fps).toFixed(1)}s) -> ${stats.out} ` +
        `[${stats.backend}, ${Math.round(stats.bytes / 1024)} KiB, project ${stats.projectHash}]`,
);
console.log(`fonts: ${stats.fonts.join(', ')}`);
console.log(`assets: ${stats.assets.length} fingerprinted`);
if (stats.audioLevel) {
    console.log(
        `audio level: peak ${stats.audioLevel.peakDbfs.toFixed(1)} dBFS, rms ${stats.audioLevel.rmsDbfs.toFixed(1)} dBFS` +
            (stats.audioLevel.clipped > 0 ? `, clipped ${stats.audioLevel.clipped}` : ''),
    );
}
for (const scene of stats.scenes) {
    console.log(`scene ${scene.id}: frames ${scene.range[0]}..${scene.range[1]}${scene.rendered ? '' : ' (not written)'}`);
}
if (stats.optionalMissing.length > 0) {
    console.log(`optional slots left empty: ${stats.optionalMissing.join(', ')}`);
}

/** One post-render contract check. */
interface Check {
    name: string;
    ok: boolean;
    detail: string;
}

/**
 * Checks a finished render against the report it returned.
 *
 * These are the facts a delivery gate can decide on without opening the file:
 * the frame count matches the written range, the reported duration matches the
 * frames, an audio track is actually audible and unclipped, and scene spans are
 * unique and non-empty. It never re-encodes or guesses.
 */
function verifyStats(stats: RenderResult): Check[] {
    const checks: Check[] = [];
    const written = stats.range[1] - stats.range[0];
    checks.push({
        name: 'output',
        ok: stats.bytes > 0,
        detail: `${stats.bytes} bytes -> ${stats.out}`,
    });
    checks.push({
        name: 'frames',
        ok: stats.frames > 0 && stats.frames === written,
        detail: `${stats.frames} frames for range ${stats.range[0]}..${stats.range[1]}`,
    });
    checks.push({
        name: 'duration',
        ok: Math.abs(stats.seconds - stats.frames / stats.fps) < 1e-6,
        detail: `${stats.seconds.toFixed(3)}s at ${stats.fps} fps`,
    });
    if (stats.audio) {
        const level = stats.audioLevel;
        checks.push({
            name: 'audio',
            ok: level !== null && level.samples > 0 && level.peakDbfs > -60,
            detail: level
                ? `peak ${level.peakDbfs.toFixed(1)} dBFS, rms ${level.rmsDbfs.toFixed(1)} dBFS, ${level.samples} samples`
                : 'declared audio but no measured level',
        });
        checks.push({
            name: 'clipping',
            ok: (level?.clipped ?? 0) === 0,
            detail: `${level?.clipped ?? 0} clipped samples`,
        });
    }
    else {
        checks.push({
            name: 'audio',
            ok: stats.audioLevel === null,
            detail: 'no audio track',
        });
    }
    const ids = new Set(stats.scenes.map((scene) => scene.id));
    checks.push({
        name: 'scenes',
        ok: stats.scenes.length > 0 && ids.size === stats.scenes.length,
        detail: stats.scenes.map((scene) => `${scene.id} ${scene.range[0]}..${scene.range[1]}`).join(', ') || 'no scenes',
    });
    if (stats.optionalMissing.length > 0) {
        checks.push({
            name: 'optional',
            ok: true,
            detail: `declared empty: ${stats.optionalMissing.join(', ')}`,
        });
    }
    return checks;
}
