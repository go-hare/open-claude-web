/**
 * Official effort fill energy residual (c360a9e1c `jne` + gne/wne/yne/bne).
 * WebGL2 cell-field energy under Ine fillShader mask. No invented CSS.
 */
import { useEffect, useRef, type MutableRefObject } from "react";

export type OfficialEffortEnergyActions = {
  pressStart: (gain: number) => void;
  pressEnd: (gain: number) => void;
};

const MAX_PIXELS = 4147200;
const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
const ZERO_RGB: [number, number, number] = [0, 0, 0];
const SRGB_RE = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i;

const VERT = String.raw`#version 300 es
in vec2 a_position;
out vec2 v_uv;
uniform vec2 u_resolution;
void main() {
  // pixel-space UV so fragment can do floor(uv / gap) without aspect distortion
  v_uv = (a_position * 0.5 + 0.5) * u_resolution;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG = String.raw`#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_fg;   // hot ink (--ui-slider-energy-hot) — the brightest thing in the bar
uniform vec3 u_fg2;  // cool ink (--ui-slider-energy-cool) — the low-energy end of
                     // the ramp: luminous lavender in light, white in dark —
                     // ALWAYS brighter than the ground it sits on, so every
                     // recruited cell reads as emitting, not as ink
uniform float u_seed; // re-rolled every press — fresh jitter and recruitment each run

// Burst ring buffer. Each slot is a one-shot burst: time it fired (in the
// u_time clock) and the origin in framebuffer pixels. Slots start far in the
// past so nothing plays on mount; old bursts age out via the cutoff below.
const int MAX_BURSTS = 8;
uniform float u_burstTime[MAX_BURSTS];
uniform vec2  u_burstCenter[MAX_BURSTS];
uniform float u_burstGain[MAX_BURSTS];   // strength k ∈ [0,1] — first stop → 0, top stop → 1


// Master envelope: 1 while pressed, eased to 0 after release so the whole
// field cools down on mouse-up instead of trailing per-burst afterglows.
uniform float u_fade;

// The charged surface, folded into the same texture: a left-edge→handle
// gradient (u_charge0 → u_charge1) that lives in the same cells as the
// energy and arrives with the same wavefront, so surface and energy read as
// one thing on one clock. u_pos is the handle fraction (0..1). The colors
// carry their token's alpha — light runs it opaque (the charge is the
// field's own ground there), and a transparent token would remove the
// surface entirely while the cells still paint.
uniform float u_pos;
uniform vec4 u_charge0;
uniform vec4 u_charge1;

// How much of the charged surface paints in the GAPS between cells (0..1).
// Light mode runs this high so the charge reads as a continuous dark ground
// for the bright cells to emit against; dark mode keeps 0 — its charge stays
// cell-masked exactly as before.
uniform float u_bedFill;

// Per-cell hue scatter (alpha channel = mix amount): a minority of cells
// lean toward each tint so the field reads rich instead of monochrome.
// Amount 0 (dark mode) leaves the ink ramp bit-identical.
uniform vec4 u_tintA; // accent blue lean
uniform vec4 u_tintB; // extended pink lean

in vec2 v_uv;
out vec4 fragColor;

// ─── the grid ───────────────────────────────────────────────────────────────
// The bar is a field of small rounded cells — the same visual language as the
// app's agent grids and activity heatmaps, packed denser for intricacy inside
// a 24px bar. At rest it is invisible — only energy makes it exist.
const float CELL_PITCH = 4.0;  // px between cell centers (cell + gap) — nominal; the
                               // grid re-derives the exact pitch so rows tile the bar height
const float CELL_SIZE  = 3.0;  // px square
const float CELL_R     = 0.9;  // corner radius, px

// ─── the energy ─────────────────────────────────────────────────────────────
// A burst is a wavefront racing outward from the press point in Manhattan
// distance, quantized to whole cells: each cell flips on as the front reaches
// it (per-cell jitter keeps the front ragged and alive), then cools back down
// through the discrete ramp behind it.
//
// Per-burst strength k (u_burstGain) slides speed, reach, brightness and
// afterglow between the _LO (faint stop) and _HI (full blast) ends.
const float SPEED_LO   = 20.0;  // wavefront speed, cells/sec
const float SPEED_HI   = 36.0;  //   full blast crosses the bar in well under 2s
const float RANGE_LO   = 10.0;  // low effort stays local to the handle, cells
const float RANGE_HI   = 55.0;  //   the full blast carries to the far end of the fill
const float DENSITY_LO = 0.30;  // fraction of cells a faint pulse recruits — sparse sketch
const float DENSITY_HI = 0.85;  //   full blast is busy but keeps dark gaps
const float JITTER     = 0.10;  // per-cell arrival scatter, sec — the organic part
const float HEAD_GAIN  = 1.25;  // arrival flash strength
const float HEAD_DECAY = 5.0;   // arrival flash fade, 1/s (fast)
const float BODY_GAIN  = 0.65;  // afterglow strength
const float BODY_LO    = 3.3;   // afterglow fade for the faint stop, 1/s — quick cool-down
const float BODY_HI    = 0.77;  //   full blast lingers ~1.3s behind the front
const float AMP_LO     = 0.55;  // overall brightness of the faintest stop
const float MAX_AGE    = 5.0;   // past this a slot is dead — skip the math

// ─── the rendering (discrete ramp + breathing top step) ─────────────────────
// Cell intensity quantizes to a 5-step ramp (never a continuous gradient),
// the ink walks from the cool ink toward the hot ink as the step rises —
// energy always reads brighter than its ground — and only top-step cells
// breathe: slow, shallow, per-cell phase so neighbours never sync up (the app
// grid's own pulse). Defaults dialed in on
// shader-explorations/grid/03-cellular-ripple.html, then packed denser.
const float RAMP_POW    = 1.4;   // ink ramp curve — keeps the cool end longer
const float INK_MAX     = 0.85;  // historical ink ceiling — now the dark-mode value of u_inkCeil
const float BREATH_DIP  = 0.28;  // top-step breath depth
const float BREATH_BASE = 2.4;   // breath period floor, sec
const float BREATH_VARY = 1.4;   // per-cell period spread, sec
// Charged-surface shape, per mode (see u_bedFill/u_tint* for the rest of the
// mode split). Dark keeps the original constants (0.85 ceiling, 1.1 ramp —
// a tint that deepens linearly toward the handle); light runs the ceiling to
// 1 with a much flatter ramp so the bed reads as a solid dark ground across
// the energized region, fading only at its left edge.
uniform float u_chargeMax;   // alpha ceiling of the charged surface at the handle
uniform float u_chargeRamp;  // exponent on the left-edge→handle deepening

// Alpha of the LOWEST ramp step (the top step is u_inkCeil). Dark keeps the
// original 0.08 — over a dark fill with additive blending, alpha IS
// brightness, so the climb from 0.08 reads as the intensity ramp. Light
// raises the floor so every recruited cell paints near-solid and the
// intensity ramp is carried by the ink COLOR (lavender → white-hot) — a
// translucent chip over the vibrant bed would just read as bed.
uniform float u_inkFloor;

// Alpha of the TOP ramp step. Dark pins the historical INK_MAX (0.85 —
// under additive blending a fully-opaque white cell blows out); light runs
// it to 1.0 so the sparse hot minority genuinely sparkles against the
// field's darker ground (measured headroom: hot cells capped at 0.61 luma
// over a 0.28 ground with the shared ceiling).
uniform float u_inkCeil;

// Multiplier on quantized cell energy. The per-cell brightness lottery is
// tuned for dark's additive regime, where even a faint white cell sparkles;
// in light's opaque regime the same distribution never reaches the hot end
// of the ink ramp, so light boosts it to put a white-hot minority on the
// board. Dark pins 1 — identical output.
uniform float u_energyGain;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  // Fit a whole number of rows into the bar height so no row is clipped at
  // the edges; cells stay square, so the right edge (hidden under the
  // handle / rounded end) absorbs any fractional column instead.
  float pitch = u_resolution.y / max(round(u_resolution.y / CELL_PITCH), 1.0);
  float cellScale = pitch / CELL_PITCH;
  vec2 cell = floor(v_uv / pitch);
  vec2 cellCenter = (cell + 0.5) * pitch;

  // Rounded-rect cell mask, anti-aliased — the gaps between cells never paint.
  float cellHalf = CELL_SIZE * 0.5 * cellScale;
  float cellR = CELL_R * cellScale;
  vec2 q = abs(v_uv - cellCenter) - vec2(cellHalf - cellR);
  float distC = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - cellR;
  float aa = min(fwidth(v_uv.x), 1.5);
  float cellMask = 1.0 - smoothstep(-aa, aa, distC);
  // Gaps can only exit early when the charged surface is strictly
  // cell-masked (u_bedFill 0); a continuous bed must keep painting them.
  if (cellMask <= 0.0 && u_bedFill <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  float jitter = (hash21(cell + 41.7 + u_seed) - 0.5) * 2.0 * JITTER;
  float vary   = 0.35 + 0.65 * hash21(cell + 13.7 + u_seed); // some cells catch much brighter than others

  float energy = 0.0;
  float charged = 0.0;
  for (int i = 0; i < MAX_BURSTS; i++) {
    float age = u_time - u_burstTime[i];
    if (age < 0.0 || age > MAX_AGE) continue;
    float k = clamp(u_burstGain[i], 0.0, 1.0);

    vec2 originCell = floor(u_burstCenter[i] / pitch);
    float manh = abs(cell.x - originCell.x) + abs(cell.y - originCell.y);

    // Gentle falloff so the field carries to the ends of the revealed bar at
    // full blast instead of dying out mid-bar.
    float range   = mix(RANGE_LO, RANGE_HI, k);
    float falloff = exp(-manh / (range * 0.85));
    float reach   = exp(-max(manh - range, 0.0) * 0.12);
    float speed   = mix(SPEED_LO, SPEED_HI, k);
    float t = age - manh / speed - jitter;
    // The charged surface arrives with the same front: once any burst has
    // reached this cell it stays charged for as long as the press lives.
    charged = max(charged, smoothstep(0.0, 0.15, t) * reach);
    if (t < 0.0) continue;

    // The recruitment lottery re-rolls per burst (the burst's own timestamp
    // is part of the ticket), so every pulse lights a different subset of
    // cells — a held press keeps tracing new patterns instead of re-lighting
    // the same ones. The lottery only gates the bright energy cells; the
    // charged surface below recruits every cell the front reaches.
    float rank = hash21(cell + 7.3 + u_seed + u_burstTime[i]);
    if (rank > mix(DENSITY_LO, DENSITY_HI, k)) continue;

    float head = HEAD_GAIN * exp(-t * HEAD_DECAY);
    float body = BODY_GAIN * exp(-t * mix(BODY_LO, BODY_HI, k));
    energy += (head + body) * mix(AMP_LO, 1.0, k) * falloff * reach * vary;
  }


  // The master envelope scales energy BEFORE quantization, so on release the
  // whole field cools down through the ramp instead of fading in place. The
  // per-cell brightness lottery is applied here too — after saturation — so
  // it spreads cells across the whole ramp instead of being washed out once
  // energy pegs: most cells sit dim-to-mid, a minority run hot, the darkest
  // stay barely lit. Skew (pow) pushes the distribution toward dark.
  // Each cell drifts between two personal brightness identities on its own
  // slow, randomly-phased cycle, so which cells read bright or dark keeps
  // redistributing — the mosaic never freezes into a fixed pattern.
  float lumA = hash21(cell + 8.8 + u_seed);
  float lumB = hash21(cell + 88.8 + u_seed);
  float lumDrift = 0.5 + 0.5 * sin(u_time * 0.35 + lumA * 6.2832);
  float lum = pow(mix(lumA, lumB, lumDrift), 1.9);
  // A faint coherent wave keeps drifting right→left between pulses, with a
  // touch of per-cell phase scatter so it reads as current, not as a bar.
  float stream = 0.9 + 0.16 * sin(u_time * 1.3 + cell.x * 0.45 + lumB * 2.0);
  float e = clamp(energy, 0.0, 1.0) * u_fade * mix(0.16, 1.0, lum) * stream
    * u_energyGain;

  // The charged surface: a left-edge→handle gradient living in the same
  // cells, revealed by the same wavefront and the same envelope. Deeper
  // toward the handle; nothing where the front hasn't reached.
  float g = clamp(v_uv.x / max(u_pos * u_resolution.x, 1.0), 0.0, 1.0);
  vec3 chargeColor = mix(u_charge0.rgb, u_charge1.rgb, g);
  // The bed factor lets the charge spill into the gaps (light mode's
  // continuous dark ground) while the cells still sit a notch deeper, so the
  // grid stays legible inside the bed without bright gap-lines cutting it up.
  float bedMask = mix(u_bedFill, 1.0, cellMask);
  float chargeA = u_chargeMax * pow(g, u_chargeRamp) * charged * u_fade
    * bedMask * mix(u_charge0.a, u_charge1.a, g);

  // Discrete 5-step ramp for the energy on top — never a continuous gradient.
  // Empty at rest: energy IS visibility.
  float lv = step(0.04, e) + step(0.2, e) + step(0.4, e) + step(0.6, e) + step(0.8, e);
  // Linear alpha climb from the mode's floor — every step participates, so
  // the right-to-left intensity progression reads in both modes.
  float alpha = lv <= 0.0 ? 0.0 : mix(u_inkFloor, u_inkCeil, (lv - 1.0) / 4.0);

  // Only the hottest cells breathe — slow, shallow, never in unison.
  if (lv >= 5.0) {
    float period = BREATH_BASE + BREATH_VARY * hash21(cell + 3.1 + u_seed);
    float phase = hash21(cell + 5.5 + u_seed) * 6.2832;
    alpha *= 1.0 - BREATH_DIP * 0.5 * (1.0 + sin(u_time * 6.2832 / period + phase));
  }

  // Energy over charge (premultiplied), on a transparent canvas — the slider
  // fill shows through wherever neither paints.
  vec3 ink = mix(u_fg2, u_fg, pow(lv / 5.0, RAMP_POW));
  // Hue scatter: each cell draws a stable lottery ticket; the top of the
  // range leans blue, the bottom leans pink, the middle keeps the base
  // purple ramp. Tint alphas of 0 bypass this entirely.
  float hueSel = hash21(cell + 27.9 + u_seed);
  ink = mix(ink, u_tintA.rgb, u_tintA.a * smoothstep(0.62, 0.95, hueSel));
  // Pink leans the bottom of the range. Written as an inverted forward
  // smoothstep (1 - smoothstep(0.05, 0.38, …)) rather than a descending one
  // (smoothstep(0.38, 0.05, …)): GLSL leaves smoothstep undefined when
  // edge0 >= edge1, and a NaN here would survive the alpha-0 multiply in dark
  // mode and corrupt the ink. The polynomial's S(1-t) = 1-S(t) symmetry makes
  // this form bit-identical to the intended descending ramp.
  ink = mix(ink, u_tintB.rgb, u_tintB.a * (1.0 - smoothstep(0.05, 0.38, hueSel)));
  float eA = alpha * cellMask;
  vec3 col = ink * eA + chargeColor * chargeA * (1.0 - eA);
  float a = eA + chargeA * (1.0 - eA);
  if (a <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }
  fragColor = vec4(col, a);
}
`;

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function parseAlpha(value: string) {
  const trimmed = value.trim();
  const matched =
    trimmed.match(/^(?:rgb|hsl)a?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*([\d.]+%?)\s*\)$/i)?.[1]
    ?? trimmed.match(SRGB_RE)?.[4];
  if (matched === undefined) return 1;
  const n = matched.endsWith("%") ? parseFloat(matched) / 100 : parseFloat(matched);
  return Number.isNaN(n) ? 1 : clamp01(n);
}

function parseRgb(value: string, fallback: [number, number, number]): [number, number, number] {
  const trimmed = value.trim();
  const srgb = trimmed.match(SRGB_RE);
  if (srgb) return [clamp01(parseFloat(srgb[1])), clamp01(parseFloat(srgb[2])), clamp01(parseFloat(srgb[3]))];
  const hsl = trimmed.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (hsl) {
    const h = parseFloat(hsl[1]) / 360;
    const s = parseFloat(hsl[2]) / 100;
    const l = parseFloat(hsl[3]) / 100;
    if (s === 0) return [l, l, l];
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + 6 * (q - p) * tt;
      if (tt < 0.5) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
  }
  const rgba = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (rgba) return [parseFloat(rgba[1]) / 255, parseFloat(rgba[2]) / 255, parseFloat(rgba[3]) / 255];
  const hex6 = trimmed.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i);
  if (hex6) {
    const n = parseInt(hex6[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const hex3 = trimmed.match(/^#([0-9a-f]{3})$/i);
  if (hex3) {
    const n = parseInt(hex3[1], 16);
    return [(17 * ((n >> 8) & 15)) / 255, (17 * ((n >> 4) & 15)) / 255, (17 * (n & 15)) / 255];
  }
  return fallback;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

type QueuedAction = ["pressStart" | "pressEnd", number];

export function OfficialEffortEnergyFill({
  actionsRef,
  className,
}: {
  actionsRef: MutableRefObject<OfficialEffortEnergyActions | null>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const queue: QueuedAction[] = [];
    actionsRef.current = {
      pressStart: (gain) => { queue.push(["pressStart", gain]); },
      pressEnd: (gain) => { queue.push(["pressEnd", gain]); },
    };

    const view = canvas.ownerDocument.defaultView ?? window;
    let disposeLinked: (() => void) | null = null;
    let bootRaf1 = 0;
    let bootRaf2 = 0;
    let bootTimeout: ReturnType<typeof setTimeout> | undefined;

    const boot = () => {
      const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false });
      if (!gl) {
        actionsRef.current = null;
        return;
      }
      const parallel = gl.getExtension("KHR_parallel_shader_compile");
      const program = linkProgram(gl, VERT, FRAG);
      if (!program) {
        actionsRef.current = null;
        return;
      }

      let cancelCompile: (() => void) | null = null;
      let compileRaf = 0;
      let compileTimeout: ReturnType<typeof setTimeout> | undefined;

      const onLinked = () => {
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          gl.deleteProgram(program);
          actionsRef.current = null;
          queue.length = 0;
          disposeLinked = null;
          return;
        }
        disposeLinked = (() => {
          gl.useProgram(program);
          const buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
          const aPos = gl.getAttribLocation(program, "a_position");
          gl.enableVertexAttribArray(aPos);
          gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

          const uTime = gl.getUniformLocation(program, "u_time");
          const uResolution = gl.getUniformLocation(program, "u_resolution");
          const uSeed = gl.getUniformLocation(program, "u_seed");
          const uPos = gl.getUniformLocation(program, "u_pos");
          const uCharge0 = gl.getUniformLocation(program, "u_charge0");
          const uCharge1 = gl.getUniformLocation(program, "u_charge1");
          const uBedFill = gl.getUniformLocation(program, "u_bedFill");
          const uChargeMax = gl.getUniformLocation(program, "u_chargeMax");
          const uChargeRamp = gl.getUniformLocation(program, "u_chargeRamp");
          const uInkFloor = gl.getUniformLocation(program, "u_inkFloor");
          const uInkCeil = gl.getUniformLocation(program, "u_inkCeil");
          const uEnergyGain = gl.getUniformLocation(program, "u_energyGain");
          const uTintA = gl.getUniformLocation(program, "u_tintA");
          const uTintB = gl.getUniformLocation(program, "u_tintB");
          const uFg = gl.getUniformLocation(program, "u_fg");
          const uFg2 = gl.getUniformLocation(program, "u_fg2");
          const uBurstTime = gl.getUniformLocation(program, "u_burstTime[0]");
          const uBurstCenter = gl.getUniformLocation(program, "u_burstCenter[0]");
          const uBurstGain = gl.getUniformLocation(program, "u_burstGain[0]");
          const uFade = gl.getUniformLocation(program, "u_fade");

          gl.clearColor(0, 0, 0, 0);
          gl.uniform3fv(uFg, [0.72, 0.59, 1]);
          gl.uniform3fv(uFg2, [1, 1, 1]);
          gl.uniform1f(uFade, 0);
          gl.uniform1f(uSeed, 0);
          gl.uniform1f(uPos, 1);
          gl.uniform4f(uCharge0, 0.62, 0.5, 0.92, 1);
          gl.uniform4f(uCharge1, 0.35, 0.25, 0.6, 1);
          gl.uniform1f(uBedFill, 0);
          gl.uniform1f(uChargeMax, 0.85);
          gl.uniform1f(uChargeRamp, 1.1);
          gl.uniform1f(uInkFloor, 0.08);
          gl.uniform1f(uInkCeil, 0.85);
          gl.uniform1f(uEnergyGain, 1);
          gl.uniform4f(uTintA, 0, 0, 0, 0);
          gl.uniform4f(uTintB, 0, 0, 0, 0);

          const burstTime = new Float32Array(8).fill(-1e3);
          const burstCenter = new Float32Array(16);
          const burstGain = new Float32Array(8);
          gl.uniform1fv(uBurstTime, burstTime);
          gl.uniform2fv(uBurstCenter, burstCenter);
          gl.uniform1fv(uBurstGain, burstGain);

          let burstIndex = 0;
          let pressed = false;
          let handlePos = 0;
          let fade = 0;
          let pressAge = 0;
          const doc = canvas.ownerDocument;
          const win = doc.defaultView ?? window;
          const raf = win.requestAnimationFrame.bind(win);
          const caf = win.cancelAnimationFrame.bind(win);
          let needsViewport = true;
          let cssW = 1;
          let cssH = 1;

          const resize = (wCss: number, hCss: number, dpr: number) => {
            const w = Math.max(1, wCss);
            const h = Math.max(1, hCss);
            if (w !== cssW || h !== cssH) {
              const sx = w / cssW;
              const sy = h / cssH;
              for (let i = 0; i < 8; i++) {
                burstCenter[2 * i] *= sx;
                burstCenter[2 * i + 1] *= sy;
              }
              gl.uniform2fv(uBurstCenter, burstCenter);
              cssW = w;
              cssH = h;
              needsViewport = true;
            }
            let pw = Math.max(1, Math.round(w * dpr));
            let ph = Math.max(1, Math.round(h * dpr));
            const pixels = pw * ph;
            if (pixels > MAX_PIXELS) {
              const scale = Math.sqrt(MAX_PIXELS / pixels);
              pw = Math.max(1, Math.round(pw * scale));
              ph = Math.max(1, Math.round(ph * scale));
            }
            if (canvas.width !== pw || canvas.height !== ph) {
              canvas.width = pw;
              canvas.height = ph;
              needsViewport = true;
            }
          };

          let time = 0;
          let lastNow = 0;
          let frame = 0;
          let animating = false;
          let lastBurstTime = -Infinity;
          let lastBurstWall = -Infinity;
          let nextBurstGap = 0.45;
          let resumePress = false;

          const burstStrength = (pos: number, ageNorm: number) => Math.min((0.15 + 0.7 * pos) * (0.45 + 0.55 * ageNorm), 1);

          const draw = () => {
            if (needsViewport) {
              gl.viewport(0, 0, canvas.width, canvas.height);
              gl.uniform2f(uResolution, cssW, cssH);
              needsViewport = false;
            }
            gl.uniform1f(uTime, time);
            gl.uniform1f(uPos, Math.max(handlePos, 0.02));
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
          };

          const trailing = () => time - lastBurstTime < 5;

          const tick = (now: number) => {
            const dt = 0.001 * (now - lastNow);
            time += dt;
            lastNow = now;
            fade = pressed ? Math.min(fade + dt / 0.7, 1) : Math.max(fade - dt / 0.85, 0);
            pressAge = pressed ? pressAge + dt : 0;
            if (pressed && time - lastBurstTime > nextBurstGap) {
              const ageNorm = Math.min(pressAge / 1.6, 1);
              nextBurstGap = 0.3 + 0.45 * Math.random();
              fireBurst(burstStrength(handlePos, ageNorm) * (0.85 + 0.3 * Math.random()), handlePos + 0.08 * (Math.random() - 0.5));
            }
            const smooth = fade * fade * (3 - 2 * fade);
            gl.uniform1f(uFade, smooth);
            draw();
            if ((pressed || (trailing() && fade > 0)) && !doc.hidden) frame = raf(tick);
            else animating = false;
          };

          const startAnim = () => {
            if (animating) return;
            animating = true;
            lastNow = performance.now();
            frame = raf(tick);
          };
          const stopAnim = () => {
            if (!animating) return;
            animating = false;
            caf(frame);
          };

          const ro = new (win.ResizeObserver ?? ResizeObserver)((entries) => {
            const entry = entries[0];
            const dprBox = entry.devicePixelContentBoxSize?.[0];
            if (dprBox) {
              const dpr = win.devicePixelRatio || 1;
              resize(dprBox.inlineSize / dpr, dprBox.blockSize / dpr, dpr);
            } else {
              const box = entry.borderBoxSize?.[0] ?? entry.contentBoxSize?.[0];
              const w = box?.inlineSize ?? canvas.clientWidth;
              const h = box?.blockSize ?? canvas.clientHeight;
              resize(w, h, win.devicePixelRatio || 1);
            }
            draw();
          });
          ro.observe(canvas);

          const reduceMotion = win.matchMedia("(prefers-reduced-motion: reduce)");
          const onVisibility = () => {
            if (doc.hidden) {
              resumePress = pressed;
              pressed = false;
              lastBurstTime = -Infinity;
              lastBurstWall = -Infinity;
              fade = 0;
              burstTime.fill(-1e3);
              gl.uniform1fv(uBurstTime, burstTime);
              stopAnim();
              gl.uniform1f(uFade, 0);
              draw();
            } else if (resumePress && !reduceMotion.matches) {
              resumePress = false;
              syncTokens();
              pressed = true;
              pressAge = 0;
              fireBurst(burstStrength(handlePos, 0), handlePos);
            } else if (trailing()) {
              startAnim();
            }
          };
          doc.addEventListener("visibilitychange", onVisibility);

          const fireBurst = (gain: number, pos: number) => {
            burstTime[burstIndex] = time;
            burstCenter[2 * burstIndex] = pos * cssW;
            burstCenter[2 * burstIndex + 1] = cssH * (0.35 + 0.3 * Math.random());
            burstGain[burstIndex] = gain;
            burstIndex = (burstIndex + 1) % 8;
            gl.uniform1fv(uBurstTime, burstTime);
            gl.uniform2fv(uBurstCenter, burstCenter);
            gl.uniform1fv(uBurstGain, burstGain);
            lastBurstTime = time;
            lastBurstWall = performance.now();
            if (!doc.hidden) startAnim();
          };

          const syncTokens = () => {
            const style = getComputedStyle(canvas);
            gl.uniform3fv(uFg, parseRgb(style.color, [0.72, 0.59, 1]));
            gl.uniform3fv(uFg2, parseRgb(style.outlineColor, [1, 1, 1]));
            const c0 = parseRgb(style.borderTopColor, [0.62, 0.5, 0.92]);
            const c1 = parseRgb(style.borderBottomColor, [0.35, 0.25, 0.6]);
            gl.uniform4f(uCharge0, c0[0], c0[1], c0[2], parseAlpha(style.borderTopColor));
            gl.uniform4f(uCharge1, c1[0], c1[1], c1[2], parseAlpha(style.borderBottomColor));
            // Official: wne(color, xne) fail → zero tint; else [rgb, yne(alpha)].
            const tintFrom = (cssColor: string): [number, number, number, number] => {
              const raw = cssColor.trim();
              if (!raw || raw === "transparent") return [0, 0, 0, 0];
              if (!(SRGB_RE.test(raw) || /^hsla?\(/i.test(raw) || /^rgba?\(/i.test(raw) || /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/i.test(raw))) {
                return [0, 0, 0, 0];
              }
              const rgb = parseRgb(raw, ZERO_RGB);
              return [rgb[0], rgb[1], rgb[2], parseAlpha(raw)];
            };
            gl.uniform4f(uTintA, ...tintFrom(style.textDecorationColor));
            gl.uniform4f(uTintB, ...tintFrom(style.columnRuleColor));
            const read = (name: string, fallback: number) => {
              const v = parseFloat(style.getPropertyValue(name));
              return Number.isNaN(v) ? fallback : v;
            };
            gl.uniform1f(uBedFill, clamp01(read("--ui-slider-energy-bed-fill", 0)));
            gl.uniform1f(uChargeMax, clamp01(read("--ui-slider-energy-charge-max", 0.85)));
            gl.uniform1f(uChargeRamp, Math.max(read("--ui-slider-energy-charge-ramp", 1.1), 0.01));
            gl.uniform1f(uInkFloor, clamp01(read("--ui-slider-energy-ink-floor", 0.08)));
            gl.uniform1f(uInkCeil, clamp01(read("--ui-slider-energy-ink-ceil", 0.85)));
            gl.uniform1f(uEnergyGain, Math.max(read("--ui-slider-energy-gain", 1), 0));
          };

          actionsRef.current = {
            pressStart: (gain) => {
              if (reduceMotion.matches) return;
              syncTokens();
              if (performance.now() - lastBurstWall > 5000 && fade <= 0) {
                burstTime.fill(-1e3);
                gl.uniform1fv(uBurstTime, burstTime);
                gl.uniform1f(uSeed, 512 * Math.random());
              }
              pressed = true;
              pressAge = 0;
              handlePos = gain;
              fireBurst(burstStrength(gain, 0), gain);
            },
            pressEnd: (gain) => {
              resumePress = false;
              if (pressed) {
                pressed = false;
                handlePos = gain;
                if (!doc.hidden) startAnim();
              }
            },
          };

          resize(canvas.clientWidth || 1, canvas.clientHeight || 1, win.devicePixelRatio || 1);
          draw();
          for (const [name, gain] of queue) actionsRef.current?.[name](gain);
          queue.length = 0;

          return () => {
            actionsRef.current = null;
            stopAnim();
            ro.disconnect();
            doc.removeEventListener("visibilitychange", onVisibility);
            gl.deleteProgram(program);
            gl.deleteBuffer(buffer);
          };
        })();
      };

      if (!parallel) {
        onLinked();
        return;
      }

      const poll = () => {
        compileRaf = 0;
        compileTimeout = undefined;
        if (gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR) !== true) schedule();
        else onLinked();
      };
      const schedule = () => {
        if (canvas.ownerDocument.hidden) compileTimeout = setTimeout(poll, 64);
        else compileRaf = view.requestAnimationFrame(poll);
      };
      cancelCompile = () => {
        if (compileRaf !== 0) view.cancelAnimationFrame(compileRaf);
        if (compileTimeout !== undefined) clearTimeout(compileTimeout);
        gl.deleteProgram(program);
      };
      schedule();
    };

    if (canvas.ownerDocument.hidden) bootTimeout = setTimeout(boot, 0);
    else bootRaf1 = view.requestAnimationFrame(() => { bootRaf2 = view.requestAnimationFrame(boot); });

    return () => {
      view.cancelAnimationFrame(bootRaf1);
      view.cancelAnimationFrame(bootRaf2);
      if (bootTimeout !== undefined) clearTimeout(bootTimeout);
      actionsRef.current = null;
      disposeLinked?.();
    };
  }, [actionsRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className ?? "absolute inset-0 w-full h-full pointer-events-none"}
      style={{
        color: "var(--ui-slider-energy-hot)",
        outlineColor: "var(--ui-slider-energy-cool)",
        borderTopColor: "var(--ui-slider-fill-charged-start)",
        borderBottomColor: "var(--ui-slider-fill-charged-end)",
        textDecorationColor: "var(--ui-slider-energy-tint-blue)",
        columnRuleColor: "var(--ui-slider-energy-tint-pink)",
        borderWidth: 0,
        borderStyle: "none",
      }}
    />
  );
}
