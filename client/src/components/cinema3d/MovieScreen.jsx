// MovieScreen.jsx
// The picture on the auditorium's screen, inside the 3D scene.
//
// - Always ready: the movie's poster (or its title) painted onto the curved
//   screen. This is what shows while a trailer loads, if there is none, if it
//   fails, and when the visitor prefers reduced motion.
// - Direct video files play through a VideoTexture on the curved screen itself.
//   The canvas only redraws when the video has a new frame.
// - YouTube can't be read into WebGL (it's a cross-origin player), so its
//   iframe is placed on the screen with CSS 3D (drei <Html transform>). The
//   canvas lets it show through only while the trailer is actually playing,
//   and seats or walls in front of it still hide it. The iframe never takes
//   clicks: seat picking and the camera work exactly as before.
//
// Playback is driven by props (`playing`, `muted`); progress and failures are
// reported through `onStatus`. Everything is released when the trailer, the
// movie or the whole 3D view goes away.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CanvasTexture, DoubleSide, SRGBColorSpace, VideoTexture } from "three";
import { YOUTUBE_EMBED_ORIGIN, youtubeScreenUrl } from "../../lib/trailerSource";

const CANVAS_W = 1400;
const CANVAS_H = 600;
// A trailer that hasn't started after this long is treated as unavailable.
const START_TIMEOUT_MS = 15000;
// YouTube player states (IFrame API).
const YT = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 };

/* ---------------- Poster ---------------- */

function paintScreen(ctx, title, img) {
  const g = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  g.addColorStop(0, "#0d2a5c");
  g.addColorStop(0.55, "#1b2f7a");
  g.addColorStop(1, "#3b1f74");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  let textLeft = 0;
  if (img) {
    // Soft, dark backdrop from the poster itself, then the poster on the left.
    const cover = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
    ctx.save();
    if ("filter" in ctx) ctx.filter = "blur(28px)";
    ctx.globalAlpha = 0.55;
    ctx.drawImage(img, (CANVAS_W - img.width * cover) / 2, (CANVAS_H - img.height * cover) / 2, img.width * cover, img.height * cover);
    ctx.restore();
    ctx.fillStyle = "rgba(4,6,13,0.55)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const h = CANVAS_H - 90;
    const w = Math.min(h * (img.width / img.height), CANVAS_W * 0.42);
    const x = 120;
    const y = (CANVAS_H - h) / 2;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 40;
    ctx.drawImage(img, x, y, w, h);
    ctx.shadowBlur = 0;
    textLeft = x + w;
  } else {
    const glow = ctx.createRadialGradient(CANVAS_W / 2, 270, 20, CANVAS_W / 2, 300, 700);
    glow.addColorStop(0, "rgba(140,200,255,0.35)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  const cx = img ? textLeft + (CANVAS_W - textLeft) / 2 : CANVAS_W / 2;
  const maxW = img ? CANVAS_W - textLeft - 120 : CANVAS_W - 200;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.font = "700 70px Outfit, Inter, system-ui, sans-serif";
  ctx.fillText(title || "Now showing", cx, CANVAS_H / 2 - 20, maxW);
  ctx.font = "500 26px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(200,220,255,0.72)";
  ctx.fillText("CINEBOOK  ·  NOW SHOWING", cx, CANVAS_H / 2 + 60, maxW);
}

/** The screen's resting picture: poster and title, or the title alone. */
function usePosterTexture(title, posterUrl) {
  const invalidate = useThree((s) => s.invalidate);
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = CANVAS_W;
    c.height = CANVAS_H;
    return c;
  }, []);
  const texture = useMemo(() => {
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [canvas]);

  useEffect(() => {
    const ctx = canvas.getContext("2d");
    paintScreen(ctx, title, null);
    texture.needsUpdate = true;
    invalidate();
    if (!posterUrl) return undefined;

    // A poster from another site can only be painted if it allows it (CORS);
    // otherwise the title-only picture simply stays.
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (!alive || !img.width || !img.height) return;
      try {
        paintScreen(ctx, title, img);
        texture.needsUpdate = true;
        invalidate();
      } catch (e) {
        paintScreen(ctx, title, null);
      }
    };
    img.src = posterUrl;
    return () => {
      alive = false;
      img.onload = null;
      img.src = "";
    };
  }, [canvas, texture, title, posterUrl, invalidate]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/* ---------------- Direct video file ---------------- */

/** Plays a video file into a texture cropped to the screen's shape. */
function useVideoTexture(src, { playing, muted, screenAspect, onStatus }) {
  const invalidate = useThree((s) => s.invalidate);
  const [state, setState] = useState({ video: null, texture: null, shown: false });
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    if (!src) return undefined;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");

    const texture = new VideoTexture(video);
    texture.colorSpace = SRGBColorSpace;
    let alive = true;
    let frameHandle = 0;
    const report = (s) => alive && statusRef.current?.(s);

    // Redraw only when the video produced a new frame.
    const onFrame = () => {
      if (!alive) return;
      invalidate();
      frameHandle = video.requestVideoFrameCallback
        ? video.requestVideoFrameCallback(onFrame)
        : window.setTimeout(onFrame, 1000 / 30);
    };
    const onLoaded = () => {
      // Crop (cover) the video to the wide screen instead of stretching it.
      const videoAspect = video.videoWidth / video.videoHeight || 16 / 9;
      if (screenAspect > videoAspect) {
        texture.repeat.set(1, videoAspect / screenAspect);
        texture.offset.set(0, (1 - texture.repeat.y) / 2);
      } else {
        texture.repeat.set(screenAspect / videoAspect, 1);
        texture.offset.set((1 - texture.repeat.x) / 2, 0);
      }
    };
    const onPlaying = () => {
      if (!alive) return;
      setState((s) => (s.shown ? s : { ...s, shown: true }));
      report("playing");
    };
    const onPause = () => report("paused");
    const onWaiting = () => report("buffering");
    const onError = () => {
      if (!alive) return;
      setState((s) => ({ ...s, shown: false }));
      report("failed");
    };
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("error", onError);
    const timer = window.setTimeout(() => {
      if (alive && video.readyState < 2) onError();
    }, START_TIMEOUT_MS);

    video.src = src;
    onFrame();
    setState({ video, texture, shown: false });
    report("loading");

    return () => {
      alive = false;
      window.clearTimeout(timer);
      if (video.cancelVideoFrameCallback && frameHandle) video.cancelVideoFrameCallback(frameHandle);
      else window.clearTimeout(frameHandle);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("error", onError);
      video.pause();
      // Detaching the source releases the decoder and any buffered data.
      video.removeAttribute("src");
      video.load();
      texture.dispose();
      setState({ video: null, texture: null, shown: false });
    };
  }, [src, screenAspect, invalidate]);

  const { video } = state;
  useEffect(() => {
    if (!video) return;
    video.muted = muted;
    if (playing) {
      const p = video.play();
      // Autoplay refused (rare once muted): wait for the Play button.
      if (p && p.catch) p.catch(() => statusRef.current?.("paused"));
    } else {
      video.pause();
    }
  }, [video, playing, muted]);

  return state.shown ? state.texture : null;
}

/* ---------------- YouTube ---------------- */

const holeShader = {
  vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: "void main() { gl_FragColor = vec4(0.0); }",
};

function YouTubeOnScreen({ id, position, width, height, lowPower, playing, muted, onStatus, onShown }) {
  const invalidate = useThree((s) => s.invalidate);
  const frameRef = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const readyRef = useRef(false);
  const startedRef = useRef(false);
  const wantRef = useRef({ playing, muted });
  wantRef.current = { playing, muted };
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;
  const shownRef = useRef(onShown);
  shownRef.current = onShown;

  // A smaller player on low-power devices: YouTube then streams a lighter video.
  const px = lowPower ? { w: 640, h: 360 } : { w: 1280, h: 720 };
  const distanceFactor = (width * 400) / px.w;
  const src = useMemo(() => youtubeScreenUrl(id), [id]);

  const send = (func, args = []) => {
    const win = frameRef.current?.contentWindow;
    if (win) win.postMessage(JSON.stringify({ event: "command", func, args }), YOUTUBE_EMBED_ORIGIN);
  };
  const apply = () => {
    if (!readyRef.current) return;
    send(wantRef.current.muted ? "mute" : "unMute");
    send(wantRef.current.playing ? "playVideo" : "pauseVideo");
  };

  useEffect(() => {
    let alive = true;
    const report = (s) => alive && statusRef.current?.(s);
    const onMessage = (e) => {
      if (e.origin !== YOUTUBE_EMBED_ORIGIN || e.source !== frameRef.current?.contentWindow) return;
      let data;
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch (err) {
        return;
      }
      if (!data || typeof data !== "object") return;
      if (data.event === "onReady" && !readyRef.current) {
        readyRef.current = true;
        apply();
        return;
      }
      if (data.event === "onError") {
        report("failed");
        return;
      }
      const state =
        data.event === "onStateChange" ? data.info : data.event === "infoDelivery" ? data.info?.playerState : undefined;
      if (typeof state !== "number") return;
      if (state === YT.PLAYING) {
        if (!startedRef.current) {
          startedRef.current = true;
          setRevealed(true);
          shownRef.current?.(true);
        }
        report("playing");
      } else if (state === YT.PAUSED || state === YT.ENDED) {
        report("paused");
      } else if (state === YT.BUFFERING && startedRef.current) {
        report("buffering");
      }
    };
    window.addEventListener("message", onMessage);
    report("loading");
    const timer = window.setTimeout(() => {
      if (startedRef.current) return;
      // Loaded but autoplay was refused: offer the Play button. Never loaded: give up.
      report(readyRef.current ? "paused" : "failed");
    }, START_TIMEOUT_MS);
    return () => {
      alive = false;
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      shownRef.current?.(false);
    };
  }, [id]);

  // Play / pause / mute from the controls outside the 3D view.
  useEffect(() => {
    apply();
  }, [playing, muted]);

  useEffect(() => {
    invalidate();
  }, [revealed, invalidate]);

  const onLoad = () => {
    // Ask the player to send us its events (YouTube IFrame API handshake).
    const win = frameRef.current?.contentWindow;
    if (win) win.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), YOUTUBE_EMBED_ORIGIN);
  };

  return (
    <Html
      transform
      occlude="blending"
      position={position}
      distanceFactor={distanceFactor}
      pointerEvents="none"
      style={{ pointerEvents: "none" }}
      material={<shaderMaterial side={DoubleSide} visible={revealed} {...holeShader} />}
    >
      <div style={{ width: px.w, height: px.h, background: "#000", pointerEvents: "none" }}>
        <iframe
          ref={frameRef}
          src={src}
          onLoad={onLoad}
          title="Movie trailer on the auditorium screen"
          width={px.w}
          height={px.h}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="screen-trailer-frame"
          style={{ border: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        />
      </div>
    </Html>
  );
}

/* ---------------- The screen ---------------- */

/**
 * trailer: { source, active, playing, muted, onStatus } — `active` mounts the
 * player (once wanted), `playing` / `muted` steer it.
 */
export default function MovieScreen({ geometry, centerY, screen, title, poster, trailer, lowPower }) {
  const posterTexture = usePosterTexture(title, poster);
  const source = trailer?.active ? trailer.source : null;
  const screenAspect = screen.width / screen.height;
  const [youtubeShown, setYoutubeShown] = useState(false);

  const videoTexture = useVideoTexture(source?.kind === "video" ? source.src : null, {
    playing: !!trailer?.playing,
    muted: trailer?.muted !== false,
    screenAspect,
    onStatus: trailer?.onStatus,
  });

  // YouTube is 16:9: as tall as the screen, centred, just in front of the
  // curved surface so its edges aren't hidden by the curve.
  const ytHeight = screen.height;
  const ytWidth = Math.min(screen.width, (ytHeight * 16) / 9);
  const half = screen.width / 2;
  const curveAtEdge = (screen.curve || 0) * half * (ytWidth / 2 / half) ** 2;
  const showYoutube = source?.kind === "youtube";
  const blackout = showYoutube && youtubeShown;

  return (
    <>
      <mesh geometry={geometry} position={[0, centerY, 0]}>
        {/* The same material throughout (only its map/colour change), so no shader recompiles. */}
        <meshBasicMaterial map={videoTexture || posterTexture} color={blackout ? "#000000" : "#ffffff"} toneMapped={false} />
      </mesh>
      {showYoutube && (
        <YouTubeOnScreen
          key={source.id}
          id={source.id}
          position={[0, centerY, curveAtEdge + 0.03]}
          width={ytWidth}
          height={ytHeight}
          lowPower={lowPower}
          playing={!!trailer.playing}
          muted={trailer.muted !== false}
          onStatus={trailer.onStatus}
          onShown={setYoutubeShown}
        />
      )}
    </>
  );
}
