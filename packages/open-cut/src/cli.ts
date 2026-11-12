#!/usr/bin/env node
/**
 * OpenCut CLI — compile a film script into an MP4.
 *
 * Usage:
 *   open-cut render <film.mjs|film.ts> [--out file.mp4]
 *   open-cut version
 *
 * The film module must default-export a `Film` instance (or an object with a
 * `film` export). Exit codes: 0 success, 1 runtime failure, 2 usage error.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Film } from './dsl.js';
import { nativeVersion } from './index.js';

function fail(message: string, code: number): never {
    console.error(`open-cut: ${message}`);
    process.exit(code);
}

const args = process.argv.slice(2);
const command = args[0];

if (command === 'version' || command === undefined) {
    console.log(command === undefined ? 'usage: open-cut render <film> [--out file.mp4] | open-cut version' : nativeVersion());
    process.exit(command === undefined ? 2 : 0);
}

if (command !== 'render') {
    fail(`unknown command ${command}`, 2);
}

const script = args[1];
if (!script) {
    fail('render requires a film script path', 2);
}
const outIndex = args.indexOf('--out');
const outArg = outIndex >= 0 ? args[outIndex + 1] : undefined;
if (outIndex >= 0 && outArg === undefined) {
    fail('--out requires a path', 2);
}
const out = outArg ?? path.join(path.dirname(path.resolve(script)), 'film.mp4');

const module = await import(pathToFileURL(path.resolve(script)).href);
const film: unknown = module.default ?? module.film;
if (!(film instanceof Film)) {
    fail('the film module must default-export a Film instance', 2);
}

const stats = film.render(path.resolve(out));
console.log(`rendered ${stats.frames} frames (${stats.seconds.toFixed(1)}s) -> ${stats.out} [${stats.backend}, ${Math.round(stats.bytes / 1024)} KiB]`);
