#!/usr/bin/env node
/**
 * OpenCut CLI — compile a film script into an MP4.
 *
 * Usage:
 *   open-cut render <film.mjs|film.ts> [--out file.mp4] [--from s] [--to s] [--cancel-file path]
 *   open-cut preview <film.mjs|film.ts> --frame N --out file.png
 *   open-cut build
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
    console.log(command === undefined ? 'usage: open-cut render <film> [--out file.mp4] | open-cut build | open-cut version' : nativeVersion());
    process.exit(command === undefined ? 2 : 0);
}

if (command === 'build') {
    const build = nativeBuild();
    console.log(`${build.version} ${build.sourceRev}${build.dirty ? ' (dirty)' : ''} [${build.profile}]`);
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
        console.log(`frame ${stats.frame} -> ${outArg} [${stats.width}x${stats.height}, project ${stats.projectHash}]`);
        console.log(`fonts: ${stats.fonts.join(', ')}`);
    }
    catch (error) {
        fail(error instanceof Error ? error.message : String(error), 1);
    }
    process.exit(0);
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
const startFrame = from === undefined ? undefined : Math.round(Number(from) * film.fps);
const endFrame = to === undefined ? undefined : Math.round(Number(to) * film.fps);

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
console.log(
    `rendered frames ${stats.range[0]}..${stats.range[1]} (${stats.frames} frames, ${(stats.frames / stats.fps).toFixed(1)}s) -> ${stats.out} ` +
        `[${stats.backend}, ${Math.round(stats.bytes / 1024)} KiB, project ${stats.projectHash}]`,
);
console.log(`fonts: ${stats.fonts.join(', ')}`);
if (stats.optionalMissing.length > 0) {
    console.log(`optional slots left empty: ${stats.optionalMissing.join(', ')}`);
}
