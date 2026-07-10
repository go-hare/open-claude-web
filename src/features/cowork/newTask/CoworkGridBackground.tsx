import { useEffect, useRef } from "react";

const backgroundAnimationKey = "LSS-appearance:backgroundAnimation";
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const maxPixels = 4_147_200;
const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
const vertexSource = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
uniform vec2 u_resolution;
void main() {
  v_uv = (a_position * 0.5 + 0.5) * u_resolution;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
const dotGridFragmentSource = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_color;
in vec2 v_uv;
out vec4 fragColor;
const float GAP = 22.0;
const float DOT_R = 1.6;
const float R_MIN = 1.0;
const float ARMS = 2.0;
const float PITCH = 0.08;
const float SPIN = 0.25;
const float DRIFT = 0.035;
const float WIDTH = 0.55;
const float GAMMA = 2.2;
const float RIPPLE_AMP = 3.0;
const float RIPPLE_FREQ = 0.020;
const float RIPPLE_VEL = 0.12;
const float RIPPLE_TURN = 0.015;
void main() {
  vec2 cell = floor(v_uv / GAP);
  float h = u_time * RIPPLE_TURN;
  vec2 k1 = vec2(cos(h), sin(h));
  vec2 k2 = vec2(cos(h + 1.05), sin(h + 1.05));
  float s1 = sin(dot(cell, k1) * RIPPLE_FREQ * 6.2831853 - u_time * RIPPLE_VEL);
  float s2 = sin(dot(cell, k2) * RIPPLE_FREQ * 6.2831853 - u_time * RIPPLE_VEL * 0.8);
  vec2 disp = (k1 * s1 + k2 * s2) * RIPPLE_AMP * 0.5;
  vec2 local = v_uv - (cell + 0.5) * GAP - disp;
  float dist = length(local);
  vec2 gridSize = u_resolution / GAP;
  vec2 origin = gridSize * 0.5 + gridSize * 0.35 * vec2(sin(u_time * DRIFT * 3.0), cos(u_time * DRIFT * 2.0));
  vec2 d = cell - origin;
  float phase = atan(d.y, d.x) * ARMS + length(d) * PITCH - u_time * SPIN;
  float dArm = acos(cos(phase)) / 3.14159265;
  float t = max(1.0 - dArm / WIDTH, 0.0);
  float a = pow(t, GAMMA);
  float r = mix(R_MIN, DOT_R, t);
  float aa = fwidth(dist);
  float mask = 1.0 - smoothstep(r - aa, r + aa, dist);
  fragColor = u_color * (a * mask);
}`;

export function CoworkGridBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10">
      <OfficialDotGridShader />
    </div>
  );
}

function OfficialDotGridShader() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl2", { alpha: true, antialias: false, depth: false, premultipliedAlpha: true, stencil: false });
    if (!canvas || !gl) return undefined;
    return setupDotGrid(gl, canvas);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }} aria-hidden />;
}

function setupDotGrid(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
  const program = createProgram(gl, vertexSource, dotGridFragmentSource);
  if (!program) return undefined;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  const timeLoc = gl.getUniformLocation(program, "u_time");
  const resolutionLoc = gl.getUniformLocation(program, "u_resolution");
  const colorLoc = gl.getUniformLocation(program, "u_color");
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  return runDotGridLoop({ buffer, canvas, colorLoc, gl, program, resolutionLoc, timeLoc });
}

function runDotGridLoop(ctx: DotGridContext) {
  let needsViewport = true;
  let animationEnabled = isAnimationEnabled() ? 1 : 0;
  let frame = 0;
  let randomTime = 1_000_000 * Math.random();
  let previous = performance.now();
  let running = false;
  const resize = (width: number, height: number, scale: number) => {
    const size = cappedSize(width, height, scale);
    if (ctx.canvas.width !== size.width || ctx.canvas.height !== size.height) {
      ctx.canvas.width = size.width;
      ctx.canvas.height = size.height;
      needsViewport = true;
    }
  };
  const draw = () => {
    if (needsViewport) {
      ctx.gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.gl.uniform2f(ctx.resolutionLoc, ctx.canvas.width, ctx.canvas.height);
      needsViewport = false;
    }
    ctx.gl.uniform1f(ctx.timeLoc, 0.001 * randomTime);
    ctx.gl.clear(ctx.gl.COLOR_BUFFER_BIT);
    ctx.gl.drawArrays(ctx.gl.TRIANGLES, 0, 6);
  };
  const tick = (now: number) => {
    randomTime += (now - previous) * animationEnabled;
    previous = now;
    draw();
    frame = requestAnimationFrame(tick);
  };
  const start = () => { if (!running && animationEnabled !== 0) { running = true; previous = performance.now(); frame = requestAnimationFrame(tick); } };
  const stop = () => { if (running) { running = false; cancelAnimationFrame(frame); } };
  const cleanupAnimationSetting = watchAnimationSetting((enabled) => { animationEnabled = enabled ? 1 : 0; animationEnabled === 0 ? (stop(), draw()) : document.hidden || start(); });
  const resizeObserver = new ResizeObserver((entries) => { resizeFromEntry(ctx.canvas, entries[0], resize); draw(); });
  const themeObserver = new MutationObserver(() => requestAnimationFrame(() => { updateColor(ctx.gl, ctx.canvas, ctx.colorLoc); draw(); }));
  const visibility = () => { document.hidden ? stop() : start(); };
  resizeObserver.observe(ctx.canvas);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
  document.addEventListener("visibilitychange", visibility);
  updateColor(ctx.gl, ctx.canvas, ctx.colorLoc);
  resize(ctx.canvas.clientWidth || 1, ctx.canvas.clientHeight || 1, window.devicePixelRatio || 1);
  draw();
  document.hidden || start();
  return () => {
    stop();
    cleanupAnimationSetting();
    resizeObserver.disconnect();
    themeObserver.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    ctx.gl.deleteProgram(ctx.program);
    ctx.gl.deleteBuffer(ctx.buffer);
  };
}

type DotGridContext = {
  buffer: WebGLBuffer | null;
  canvas: HTMLCanvasElement;
  colorLoc: WebGLUniformLocation | null;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  resolutionLoc: WebGLUniformLocation | null;
  timeLoc: WebGLUniformLocation | null;
};

function resizeFromEntry(canvas: HTMLCanvasElement, entry: ResizeObserverEntry, resize: (width: number, height: number, scale: number) => void) {
  const deviceSize = entry.devicePixelContentBoxSize?.[0];
  if (deviceSize) return resize(deviceSize.inlineSize, deviceSize.blockSize, 1);
  const box = entry.borderBoxSize?.[0] ?? entry.contentBoxSize?.[0];
  resize(box?.inlineSize ?? canvas.clientWidth, box?.blockSize ?? canvas.clientHeight, window.devicePixelRatio || 1);
}

function cappedSize(width: number, height: number, scale: number) {
  let nextWidth = Math.max(1, Math.round(width * scale));
  let nextHeight = Math.max(1, Math.round(height * scale));
  const pixels = nextWidth * nextHeight;
  if (pixels > maxPixels) {
    const nextScale = Math.sqrt(maxPixels / pixels);
    nextWidth = Math.max(1, Math.round(nextWidth * nextScale));
    nextHeight = Math.max(1, Math.round(nextHeight * nextScale));
  }
  return { height: nextHeight, width: nextWidth };
}

function updateColor(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, colorLoc: WebGLUniformLocation | null) {
  const rawColor = getComputedStyle(canvas).getPropertyValue("--t5").trim() || "hsla(0, 0%, 50%, 0.5)";
  const [red, green, blue, alpha] = parseCssColor(rawColor);
  gl.uniform4f(colorLoc, red * alpha, green * alpha, blue * alpha, alpha);
}

function parseCssColor(value: string): [number, number, number, number] {
  const hsl = value.trim().match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (hsl) return hslToRgba(Number(hsl[1]) / 360, Number(hsl[2]) / 100, Number(hsl[3]) / 100, hsl[4] === undefined ? 1 : Number(hsl[4]));
  const rgb = value.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (rgb) return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255, rgb[4] === undefined ? 1 : Number(rgb[4])];
  const hex = value.trim().match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (!hex) return [0.5, 0.5, 0.5, 0.5];
  const int = Number.parseInt(hex[1], 16);
  return [(int >> 16 & 255) / 255, (int >> 8 & 255) / 255, (int & 255) / 255, hex[2] ? Number.parseInt(hex[2], 16) / 255 : 1];
}

function hslToRgba(h: number, s: number, l: number, a: number): [number, number, number, number] {
  if (s === 0) return [l, l, l, a];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3), a];
}

function hue(p: number, q: number, t: number) {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
}

function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertex);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragment);
  if (!vertexShader || !fragmentShader) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function isAnimationEnabled() {
  const setting = readAnimationSetting();
  return setting === "enabled" || (setting !== "disabled" && !window.matchMedia(reducedMotionQuery).matches);
}

function readAnimationSetting() {
  try {
    const item = localStorage.getItem(backgroundAnimationKey);
    if (!item) return "system";
    const parsed = JSON.parse(item) as { value?: unknown };
    return typeof parsed.value === "string" ? parsed.value : "system";
  } catch {
    return "system";
  }
}

function watchAnimationSetting(onChange: (enabled: boolean) => void) {
  const media = window.matchMedia(reducedMotionQuery);
  const notify = () => onChange(isAnimationEnabled());
  const onStorage = (event: StorageEvent) => { if (event.key === backgroundAnimationKey) notify(); };
  media.addEventListener("change", notify);
  window.addEventListener("storage", onStorage);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener("storage", onStorage);
  };
}
