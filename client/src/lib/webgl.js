// Feature checks for the 3D auditorium.

let cached;

/** True when the browser can create a WebGL context. */
export function hasWebGL() {
  if (cached !== undefined) return cached;
  try {
    const canvas = document.createElement("canvas");
    const gl = window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl"));
    cached = !!gl;
    // Release the probe context: browsers allow only a few at once.
    if (gl && gl.getExtension("WEBGL_lose_context")) gl.getExtension("WEBGL_lose_context").loseContext();
  } catch (e) {
    cached = false;
  }
  return cached;
}

let rendererCache;

/** The GPU (or software renderer) WebGL runs on, e.g. "ANGLE (Intel …)" or "SwiftShader". */
export function getRendererName() {
  if (rendererCache !== undefined) return rendererCache;
  rendererCache = "";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      rendererCache = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext(); // free the probe context straight away
    }
  } catch (e) {
    rendererCache = "";
  }
  return rendererCache;
}

/** True when WebGL is drawn by the CPU instead of a GPU (no hardware acceleration). */
export const isSoftwareRenderer = (name = getRendererName()) => /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);

/** Devices where we turn off shadows and antialiasing to keep things smooth. */
export function isLowPowerDevice() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const saveData = navigator.connection && navigator.connection.saveData;
  return cores <= 4 || memory <= 2 || !!saveData || isSoftwareRenderer();
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isNarrowScreen = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 639px)").matches;
