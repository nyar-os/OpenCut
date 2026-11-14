/**
 * Post-render contract checks shared by every host.
 *
 * A render report already states what was written; these checks turn it into a
 * pass/fail gate so CI and product CLIs decide on facts instead of opening the
 * file. They never re-encode, re-decode or guess a missing value.
 */
import type { RenderResult } from './native.js';

/** One named check over a finished render. */
export interface RenderCheck {
    name: string;
    ok: boolean;
    detail: string;
}

/**
 * Checks a finished render against the report it returned.
 *
 * Covers an existing output, frame count equal to the written range, duration
 * consistent with frames and fps, an audible unclipped audio bed when audio is
 * declared (and no level when it is not), and unique non-empty scene spans.
 * Declared optional empty slots are reported but never fail the run.
 */
export function verifyRender(stats: RenderResult): RenderCheck[] {
    const checks: RenderCheck[] = [];
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
