#!/usr/bin/env node
/** Stage an already-built native artifact into the platform package. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTarget } from './platform.ts';
import { stageNative } from './build-napi.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = resolveTarget();
const { src, dest } = stageNative(root, target);
console.log(`staged ${src} -> ${dest}`);
