import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { Box3, MathUtils, Vector3 } from "three";
import HallScene from "./HallScene";
import { TrailerControls, useScreenTrailer } from "./ScreenTrailer";
import SeatInstances, { seatState, useSeatColors } from "./SeatInstances";
import Icon from "../ui/Icon";
import HoldCountdown from "../HoldCountdown";
import { Spinner } from "../ui/Feedback";
import { buildAuditorium, viewingInfo } from "../../lib/auditorium";
import { formatPrice } from "../../lib/format";
import { getRendererName } from "../../lib/webgl";

const { ACTION } = CameraControlsImpl;
const INTRO_SCROLL = 420; // px of page scroll that fly the camera from the stage to the seats
const LEGEND = [
  ["available", "Available"],
  ["selected", "Selected"],
  ["reserved", "Reserved"],
  ["booked", "Unavailable"],
];
const STATE_LABEL = { available: "Available", premium: "Available", selected: "Selected", booked: "Unavailable (booked)", reserved: "Reserved by another customer" };

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Vertical field of view of the camera (see <Canvas camera>), in degrees.
const FOV = 52;
// Width of the floating booking panel on tablets and desktops, plus its margins.
const PANEL_PX = 302;

/** Top-down framing: front row at 22 % from the top, back row at 90 %. */
function mapFraming(front, back, topFloor) {
  const top = 0.22;
  const bottom = 0.9;
  const visibleDepth = (back - front + 1.2) / (bottom - top);
  const height = visibleDepth / 2 / Math.tan(MathUtils.degToRad(FOV / 2));
  const centreZ = front - 0.6 + (0.5 - top) * visibleDepth;
  const baseY = topFloor * 0.5;
  return { pos: [0, baseY + height, centreZ + 0.02 * height], target: [0, baseY, centreZ] };
}

/** Camera positions derived from the hall's real dimensions. */
function usePresets(hall) {
  return useMemo(() => {
    const rows = hall.rows;
    const first = rows[0];
    const last = rows[rows.length - 1];
    const front = first.z;
    const back = last.z;
    const mid = (front + back) / 2;
    const midRow = rows[Math.floor(rows.length / 2)];
    const { room, screen, geometry: g } = hall;
    const eye = g.eyeHeight || 1.15;
    const screenCenter = [0, screen.bottom + screen.height / 2, 0];
    const topFloor = Math.max(...rows.map((r) => r.floorY));
    // From a seat block, a little above eye height so the rows in front show too.
    const fromRow = (row, dz, lift) => ({ pos: [0, row.floorY + eye + lift, row.z + dz], target: screenCenter });
    return {
      screenCenter,
      overview: {
        pos: [room.width * 0.22, Math.min(room.height - 0.6, Math.max(room.height * 0.95, topFloor + 6)), Math.min(room.depth - 0.5, back + 5)],
        target: [0, 1.4 + topFloor * 0.3, mid * 0.75],
      },
      front: fromRow(first, 1.6, 0.9),
      centre: fromRow(midRow, 0.6, 1.0),
      rear: { pos: [0, last.floorY + eye + 1.6, Math.min(room.depth - 0.4, back + 1.6)], target: screenCenter },
      // Looking down on the seats, framed so the front row sits below the camera
      // toolbar and trailer controls (top ~20 % of the view) and the back row
      // stays above the bottom edge.
      map: mapFraming(front, back, topFloor),
      screen: { pos: [0, 3.2 + midRow.floorY * 0.5, mid], target: screenCenter },
      stage: { pos: [0, screen.bottom + 0.9, 2.6], target: [0, 2.6, mid + 4] },
      bounds: new Box3(new Vector3(-room.width / 2, 0, -1), new Vector3(room.width / 2, room.height, room.depth)),
      maxDistance: Math.max(42, room.depth * 1.25),
    };
  }, [hall]);
}

// The camera views on the toolbar, in order (keys 1-5; 0 resets).
const VIEWS = [
  ["overview", "Overview"],
  ["front", "Front"],
  ["centre", "Centre"],
  ["rear", "Rear"],
  ["map", "Seat map"],
];
const BLOCK_LABEL = { left: "Left block", centre: "Centre block", right: "Right block" };

/** Records when the first frame was actually drawn (startup diagnostics). */
function FirstFrame({ onFirstFrame }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    // useFrame runs before the frame is rendered; the next animation frame comes
    // after it (shader compilation included).
    requestAnimationFrame(() => onFirstFrame(performance.now()));
  });
  return null;
}

// The longest part of startup is the GPU compiling the scene's shader programs
// (about 0.7 s on integrated graphics). Drawing the first frame would freeze the
// page while that happens, so the canvas starts with rendering switched off,
// compiles every material in the background (KHR_parallel_shader_compile, via
// three's compileAsync) and only then draws. Without that extension, or if
// anything goes wrong, rendering simply starts and compiles as it always did.
const SHADER_WARMUP_TIMEOUT_MS = 8000;

/** Compiles the scene's shaders once, then tells the parent rendering can start. */
function ShaderWarmup({ ready, onDone }) {
  const { gl, scene, camera } = useThree();
  const get = useThree((s) => s.get);
  const started = useRef(false);

  useEffect(() => {
    // Placed after the hall and seats, so their objects are already in the scene.
    // The ref keeps re-renders and React's development double-effects from
    // starting a second compile on the same renderer.
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    let settled = false;
    const finish = (how) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      onDone({ how, ms: Math.round(performance.now() - start) });
    };
    // Never leave the loading screen up for ever (e.g. a lost GPU context).
    const timer = setTimeout(() => finish("timeout"), SHADER_WARMUP_TIMEOUT_MS);
    const parallel = typeof gl.compileAsync === "function" && gl.extensions?.has?.("KHR_parallel_shader_compile");
    if (!parallel) {
      // No background compilation here: start rendering straight away, as before.
      finish("unsupported");
      return;
    }
    Promise.resolve()
      .then(() => gl.compileAsync(scene, camera))
      .then(
        () => finish("async"),
        () => finish("error")
      );
  }, [gl, scene, camera, onDone]);

  // Rendering was paused while compiling; draw the first frame now.
  useEffect(() => {
    if (ready) get().invalidate();
  }, [ready, get]);

  return null;
}

/** Inside the canvas: exposes the camera to the overlay (tests, projection). */
function SceneBridge({ onReady }) {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    onReady({ camera, gl, invalidate });
  }, [camera, gl, invalidate, onReady]);
  return null;
}

export default function Auditorium3D({
  layout,
  seats,
  selected,
  onToggle,
  onClear,
  onContinue,
  continuing = false,
  hold,
  onRenewHold,
  availableCount,
  maxSeats,
  premiumCategory,
  movieTitle,
  moviePoster,
  trailerUrl,
  reducedMotion = false,
  lowPower = false,
  onToggleLite,
}) {
  // The movie's trailer on the big screen (poster when there's none).
  const trailer = useScreenTrailer(trailerUrl, { reducedMotion, lowPower });
  // Startup timings (ms since page start): mounted → canvas created → first frame.
  const timingsRef = useRef({ mounted: performance.now() });
  const onCanvasCreated = useCallback(() => {
    timingsRef.current.canvasCreated = performance.now();
  }, []);
  const [ready, setReady] = useState(false);
  // Rendering stays off ("never") until the shaders are compiled.
  const [shadersReady, setShadersReady] = useState(false);
  const onShadersDone = useCallback((result) => {
    timingsRef.current.shaders = result;
    setShadersReady(true);
  }, []);
  const onFirstFrame = useCallback((t) => {
    timingsRef.current.firstFrame = t;
    setReady(true);
  }, []);
  const hall = useMemo(() => buildAuditorium(layout, seats), [layout, seats]);
  const presets = usePresets(hall);
  const colors = useSeatColors();
  const controlsRef = useRef(null);
  const sceneRef = useRef(null);
  const outerRef = useRef(null);
  const stageRef = useRef(null);

  const [mode, setMode] = useState(reducedMotion ? "overview" : "intro"); // intro | overview | map | screen | seat
  const [viewSeat, setViewSeat] = useState(null);
  // Phones: the booking panel is a bottom sheet that starts collapsed.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hover, setHover] = useState(null); // { seat, x, y }
  const [introDone, setIntroDone] = useState(reducedMotion);
  const [introProgress, setIntroProgress] = useState(reducedMotion ? 1 : 0);
  // Set synchronously when the intro ends, so a scroll event that arrives before
  // React removes the listener can't move the camera back.
  const introDoneRef = useRef(introDone);
  const finishIntro = useCallback(() => {
    introDoneRef.current = true;
    setIntroDone(true);
  }, []);
  const lastPickedRef = useRef(null);
  const prevSelectedRef = useRef(selected);
  const animate = !reducedMotion;
  const shadows = !lowPower;

  const controls = () => controlsRef.current;
  const handleSceneReady = useCallback((s) => {
    sceneRef.current = s;
  }, []);

  /* ---------- Camera helpers ---------- */

  const freeLimits = useCallback(() => {
    const c = controls();
    if (!c) return;
    c.minDistance = 2.5;
    c.maxDistance = presets.maxDistance;
    c.minPolarAngle = 0.15;
    c.maxPolarAngle = Math.PI / 2 - 0.03;
    c.minAzimuthAngle = -Infinity; // full 360° rotation
    c.maxAzimuthAngle = Infinity;
    c.setBoundary(presets.bounds);
  }, [presets]);

  // The booking panel (290 px plus margins) covers the right of the view on
  // wider screens: shift the framing left so the hall is centred in the part
  // that stays visible. The shift is half the panel's share of the view, in
  // metres at the distance the camera looks from, so it scales with the hall.
  const panelOffset = useCallback((preset) => {
    const el = stageRef.current;
    const w = el?.clientWidth || 0;
    const h = el?.clientHeight || 1;
    // The panel docks to the side at the page's `md` breakpoint (the window is
    // ≥ 768 px wide), even when the 3D view itself is a little narrower.
    if (!w || !window.matchMedia("(min-width: 768px)").matches) return 0;
    const d = preset ? Math.hypot(...preset.pos.map((v, i) => v - preset.target[i])) : 20;
    const visibleWidth = 2 * d * Math.tan(MathUtils.degToRad(FOV / 2)) * (w / h);
    return ((PANEL_PX / 2) / w) * visibleWidth;
  }, []);

  const goTo = useCallback(
    (preset, nextMode, transition = animate) => {
      const c = controls();
      if (!c) return;
      freeLimits();
      c.setFocalOffset(panelOffset(preset), 0, 0, transition);
      setMode(nextMode);
      setViewSeat(null);
      c.setLookAt(...preset.pos, ...preset.target, transition);
    },
    [animate, freeLimits, panelOffset]
  );

  const enterSeatView = useCallback(
    (seat) => {
      const c = controls();
      if (!c) return;
      const eye = new Vector3(seat.x, seat.y, seat.z);
      const dir = new Vector3(...presets.screenCenter).sub(eye).normalize();
      const target = eye.clone().add(dir.multiplyScalar(0.12));
      c.setBoundary(undefined);
      c.setFocalOffset(0, 0, 0, false); // the real view from the seat, unshifted
      c.minDistance = 0.05;
      c.maxDistance = 0.2;
      c.minAzimuthAngle = -Infinity;
      c.maxAzimuthAngle = Infinity;
      c.minPolarAngle = 0;
      c.maxPolarAngle = Math.PI;
      setMode("seat");
      setViewSeat(seat);
      setSheetOpen(false); // on phones, get the sheet out of the way of the view
      c.setLookAt(eye.x, eye.y, eye.z, target.x, target.y, target.z, animate).then(() => {
        // Limited look-around from the seat: about ±40° sideways, ±20° up/down.
        const az = c.azimuthAngle;
        const pol = c.polarAngle;
        c.minAzimuthAngle = az - MathUtils.degToRad(40);
        c.maxAzimuthAngle = az + MathUtils.degToRad(40);
        c.minPolarAngle = Math.max(0.05, pol - MathUtils.degToRad(20));
        c.maxPolarAngle = Math.min(Math.PI - 0.05, pol + MathUtils.degToRad(20));
      });
    },
    [animate, presets]
  );

  const exitSeatView = useCallback(() => goTo(presets.map, "map"), [goTo, presets]);

  /* ---------- Controls set-up ---------- */

  const onControlsReady = useCallback(
    (c) => {
      if (!c || controlsRef.current === c) return;
      controlsRef.current = c;
      c.mouseButtons.wheel = ACTION.NONE; // the wheel is handled below, so the page can still scroll at the zoom limits
      c.mouseButtons.right = ACTION.TRUCK;
      c.mouseButtons.middle = ACTION.DOLLY;
      c.smoothTime = animate ? 0.45 : 0;
      c.draggingSmoothTime = animate ? 0.12 : 0;
      c.azimuthRotateSpeed = 0.6;
      c.polarRotateSpeed = 0.6;
      freeLimits();
      const start = introDone ? presets.overview : presets.stage;
      c.setFocalOffset(panelOffset(start), 0, 0, false);
      c.setLookAt(...start.pos, ...start.target, false);
      // Any drag ends the scroll intro: the user is driving now.
      // "control" fires only while the user actually drags (not on a plain click).
      // Dragging ends the scroll intro and moves the camera off any preset.
      c.addEventListener("control", () => {
        finishIntro();
        setMode((m) => (m === "seat" ? m : "free"));
      });
    },
    [animate, freeLimits, presets, introDone, finishIntro, panelOffset]
  );

  // The wheel zooms once the intro has finished (during it, scrolling flies the
  // camera in). At the zoom limits the wheel scrolls the page again, so the
  // view never traps it. Ctrl/⌘ + wheel always zooms.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      const c = controls();
      if (!c || mode === "seat") return;
      const forced = e.ctrlKey || e.metaKey;
      if (!introDoneRef.current && !forced) return;
      const zoomIn = e.deltaY < 0;
      const atLimit = zoomIn ? c.distance <= c.minDistance + 0.05 : c.distance >= c.maxDistance - 0.05;
      if (atLimit && !forced) return;
      e.preventDefault();
      finishIntro();
      const step = MathUtils.clamp(-e.deltaY * 0.02, -4, 4);
      c.dolly(step * Math.max(1, c.distance / 18), animate);
      setMode((m) => (m === "seat" ? m : "free"));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [mode, animate, finishIntro]);

  // Escape leaves the seat view.
  useEffect(() => {
    if (mode !== "seat") return undefined;
    const onKey = (e) => e.key === "Escape" && exitSeatView();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, exitSeatView]);

  // When the intro ends (scrolled through, or the user grabbed the camera), the
  // camera is wherever it is now: no preset is highlighted.
  useEffect(() => {
    if (introDone) setMode((m) => (m === "intro" ? (introProgress >= 1 ? "overview" : "free") : m));
  }, [introDone, introProgress]);

  /* ---------- Scroll-driven intro: stage → overview ---------- */

  // When the intro ends, its extra scroll space is removed. Scroll the page by the
  // same amount in the same frame so the 3D view doesn't jump.
  const stageTopRef = useRef(null);
  const hadIntroRef = useRef(!introDone);
  useLayoutEffect(() => {
    if (!introDone || !hadIntroRef.current || !stageRef.current || stageTopRef.current === null) return;
    hadIntroRef.current = false;
    const shift = stageRef.current.getBoundingClientRect().top - stageTopRef.current;
    if (Math.abs(shift) > 1) window.scrollBy(0, shift);
  }, [introDone]);
  useLayoutEffect(() => {
    if (!introDone && stageRef.current) stageTopRef.current = stageRef.current.getBoundingClientRect().top;
  });

  useEffect(() => {
    if (introDone) return undefined;
    const onScroll = () => {
      const outer = outerRef.current;
      const c = controls();
      if (!outer || !c || introDoneRef.current) return;
      const stickyTop = parseFloat(getComputedStyle(stageRef.current).top) || 0;
      const p = MathUtils.clamp((stickyTop - outer.getBoundingClientRect().top) / INTRO_SCROLL, 0, 1);
      stageTopRef.current = stageRef.current.getBoundingClientRect().top;
      setIntroProgress(p);
      // Straight-line flight (lerpLookAt would orbit, swinging the camera
      // through the side wall), eased for a smooth start and stop.
      const { stage, overview } = presets;
      const t = easeInOut(p);
      const mix = (a, b) => a.map((v, i) => v + (b[i] - v) * t);
      c.setLookAt(...mix(stage.pos, overview.pos), ...mix(stage.target, overview.target), false);
      if (p >= 1) finishIntro();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [introDone, presets, finishIntro]);

  /* ---------- Selecting seats in 3D ---------- */

  const handlePick = useCallback(
    (seat) => {
      if (seat.isBooked) return; // booked or reserved by someone else
      lastPickedRef.current = seat.seatNumber;
      finishIntro();
      onToggle(seat);
    },
    [onToggle, finishIntro]
  );

  // When a seat picked in 3D becomes selected, fly to it to show its view.
  useEffect(() => {
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = selected;
    const picked = lastPickedRef.current;
    lastPickedRef.current = null;
    if (picked && selected.includes(picked) && !prev.includes(picked)) {
      const seat = hall.seatIndex.get(picked);
      if (seat) enterSeatView(seat);
    }
    // Leave the seat view if that seat was deselected elsewhere.
    if (viewSeat && !selected.includes(viewSeat.seatNumber) && !picked) exitSeatView();
  }, [selected, hall, enterSeatView, exitSeatView, viewSeat]);

  const handleHover = useCallback((seat, e) => {
    if (!seat) return setHover(null);
    const rect = stageRef.current.getBoundingClientRect();
    setHover({ seat, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  /* ---------- Test hook (automated browsers only) ---------- */

  useEffect(() => {
    if (!navigator.webdriver) return undefined;
    window.__cinema3d = {
      getState: () => {
        const c = controls();
        const p = c ? c.getPosition(new Vector3()) : null;
        const t = c ? c.getTarget(new Vector3()) : null;
        const info = sceneRef.current?.gl.info.render;
        return {
          mode,
          introDone,
          viewSeat: viewSeat?.seatNumber || null,
          position: p && p.toArray(),
          target: t && t.toArray(),
          azimuth: c?.azimuthAngle,
          polar: c?.polarAngle,
          maxDistance: c?.maxDistance,
          drawCalls: info?.calls,
          timings: { ...timingsRef.current },
          renderer: getRendererName(),
          lowPower,
          programs: sceneRef.current?.gl.info.programs?.length,
          triangles: info?.triangles,
          memory: sceneRef.current ? { ...sceneRef.current.gl.info.memory } : null,
          seats: hall.seatCount,
          rows: hall.rows.length,
          layout: hall.id,
          trailer: trailer.status,
        };
      },
      // Screen coordinates of a point on the cinema screen (u, v from -1 to 1).
      projectScreen: (u = 0, v = 0) => {
        const scene = sceneRef.current;
        if (!scene) return null;
        const { screen } = hall;
        const p = new Vector3((u * screen.width) / 2, screen.bottom + screen.height / 2 + (v * screen.height) / 2, 0).project(scene.camera);
        const r = scene.gl.domElement.getBoundingClientRect();
        return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height, visible: p.z < 1 };
      },
      // Screen coordinates of a seat, so tests can click it like a person would.
      project: (seatNumber) => {
        const s = hall.seatIndex.get(seatNumber);
        const scene = sceneRef.current;
        if (!s || !scene) return null;
        const v = new Vector3(s.x, s.floorY + 0.5, s.z).project(scene.camera);
        const r = scene.gl.domElement.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, visible: v.z < 1 };
      },
      rotate: (deg) => controls()?.rotate(MathUtils.degToRad(deg), 0, false),
      // Seat numbers by depth and block, so tests can pick front/middle/rear x left/centre/right.
      seatsWhere: ({ block, depth } = {}) => {
        const n = hall.rows.length;
        const bands = {
          front: hall.rows.slice(0, Math.ceil(n / 4)),
          middle: hall.rows.slice(Math.floor(n * 0.4), Math.ceil(n * 0.6)),
          rear: hall.rows.slice(Math.floor(n * 0.75)),
        };
        return (bands[depth] || hall.rows).flatMap((r) => r.seats).filter((x) => !block || x.block === block).map((x) => x.seatNumber);
      },
      goTo: (name) => (name === "seat" ? null : goTo(presets[name], name, false)),
    };
    return () => {
      delete window.__cinema3d;
    };
  }, [mode, introDone, viewSeat, hall, goTo, presets, trailer.status]);

  /* ---------- Keyboard navigation (when the 3D view has focus) ---------- */

  const KEY_STEP = MathUtils.degToRad(15);
  const onKeyDown = (e) => {
    if (e.target !== e.currentTarget) return; // typing in the seat finder, a button, etc.
    const c = controls();
    if (!c) return;
    const presetKeys = Object.fromEntries(VIEWS.map(([name], i) => [String(i + 1), [name, presets[name]]]));
    let handled = true;
    if (e.key === "ArrowLeft") c.rotate(-KEY_STEP, 0, animate);
    else if (e.key === "ArrowRight") c.rotate(KEY_STEP, 0, animate);
    else if (e.key === "ArrowUp") c.rotate(0, -KEY_STEP / 2, animate);
    else if (e.key === "ArrowDown") c.rotate(0, KEY_STEP / 2, animate);
    else if ((e.key === "+" || e.key === "=") && mode !== "seat") c.dolly(3, animate);
    else if ((e.key === "-" || e.key === "_") && mode !== "seat") c.dolly(-3, animate);
    else if (e.key === "0" || e.key === "Home") goTo(presets.overview, "overview");
    else if (presetKeys[e.key]) goTo(presetKeys[e.key][1], presetKeys[e.key][0]);
    else handled = false;
    if (handled) {
      e.preventDefault();
      finishIntro();
      if (e.key.startsWith("Arrow") && mode !== "seat") setMode("free");
    }
  };

  // Seat finder: type a seat number to select it (or preview it if already selected).
  const [finder, setFinder] = useState("");
  const [finderMsg, setFinderMsg] = useState("");
  const submitFinder = (e) => {
    e.preventDefault();
    const n = finder.trim().toUpperCase();
    const seat = hall.seatIndex.get(n);
    if (!seat) return setFinderMsg(`There's no seat ${n || "with that number"}.`);
    if (selected.includes(n)) {
      setFinderMsg("");
      return enterSeatView(seat);
    }
    if (seat.isBooked) return setFinderMsg(`${n} is ${seat.reserved ? "being held by someone else" : "already booked"}.`);
    if (selected.length >= maxSeats) return setFinderMsg(`You can pick up to ${maxSeats} seats.`);
    setFinderMsg("");
    setFinder("");
    handlePick(seat);
  };

  /* ---------- Touch: scroll the page by default, explore on request ---------- */

  const coarse = useMemo(() => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches, []);
  const [touchExplore, setTouchExplore] = useState(false);
  // Layout effect: the touch mode is in force before the button's new label is
  // shown, so a swipe right after tapping "Explore" already rotates.
  useLayoutEffect(() => {
    const c = controls();
    if (!c || !coarse) return;
    // By default a sideways drag turns the hall, a pinch zooms, and an up/down
    // swipe still scrolls the page (touch-action: pan-y hands vertical swipes to
    // the browser). "Explore" also lets a drag tilt the view and two fingers pan.
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = touchExplore ? ACTION.TOUCH_DOLLY_TRUCK : ACTION.TOUCH_DOLLY;
    c.touches.three = touchExplore ? ACTION.TOUCH_TRUCK : ACTION.NONE;
    const els = [c._domElement, sceneRef.current?.gl.domElement].filter(Boolean);
    els.forEach((el) => {
      el.style.touchAction = touchExplore ? "none" : "pan-y";
    });
    if (touchExplore) finishIntro();
  });

  /* ---------- Render ---------- */

  const info = viewSeat ? viewingInfo(viewSeat, hall.screen) : null;
  const selectedSeats = selected.map((n) => hall.seatIndex.get(n)).filter(Boolean);
  const total = selectedSeats.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const hoverState = hover ? seatState(hover.seat, selected.includes(hover.seat.seatNumber), premiumCategory) : null;
  const rowOf = (n) => (n.match(/^[A-Z]+/) || [""])[0];
  const toolbarBtn = (active) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-brand-gradient text-on-brand" : "text-gray-300 hover:bg-fill-emphasis hover:text-white"}`;
  const iconBtn = "rounded-lg p-1.5 text-gray-300 hover:bg-fill-emphasis hover:text-white disabled:opacity-40";

  return (
    <div
      ref={outerRef}
      // overflow-anchor: none stops the browser's own scroll anchoring from also
      // adjusting the page when the intro's scroll space is removed.
      style={{ overflowAnchor: "none", height: introDone ? undefined : `calc(min(78vh, 680px) + ${INTRO_SCROLL}px)` }}
    >
      <div
        ref={stageRef}
        className="relative h-[min(78vh,680px)] min-h-[460px] overflow-hidden rounded-xl bg-ink-950 outline-none ring-brand-400 focus-visible:ring-2"
        style={introDone ? undefined : { position: "sticky", top: 84 }}
        data-testid="auditorium-3d"
        tabIndex={0}
        role="region"
        aria-label="3D auditorium. Use the arrow keys to look around, plus and minus to zoom, 1 to 5 for the Overview, Front, Centre, Rear and Seat map views, 0 to reset. Use the seat finder to pick seats by number."
        onKeyDown={onKeyDown}
      >
        <Canvas
          frameloop={shadersReady ? "demand" : "never"}
          shadows={shadows ? "percentage" : false}
          dpr={lowPower ? 1 : [1, 1.75]}
          camera={{ fov: FOV, near: 0.05, far: 120, position: presets.stage.pos }}
          gl={{ antialias: !lowPower, powerPreference: "high-performance" }}
          // Its own stacking context: a YouTube trailer raises the canvas's
          // z-index (see MovieScreen), which must never cover our overlays.
          style={{ isolation: "isolate" }}
          onPointerMissed={() => setHover(null)}
          onCreated={onCanvasCreated}
          aria-hidden="true"
        >
          <color attach="background" args={["#04060d"]} />
          <fog attach="fog" args={["#04060d", Math.max(40, hall.room.depth * 1.4), Math.max(95, hall.room.depth * 3)]} />
          <SceneBridge onReady={handleSceneReady} />
          <FirstFrame onFirstFrame={onFirstFrame} />
          <HallScene
            hall={hall}
            movieTitle={movieTitle}
            moviePoster={moviePoster}
            trailer={trailer.screen}
            lowPower={lowPower}
            shadows={shadows}
            topView={mode === "map"}
          />
          <SeatInstances
            hall={hall}
            selected={selected}
            premiumCategory={premiumCategory}
            hoveredSeat={hover?.seat.seatNumber}
            onHover={handleHover}
            onPick={handlePick}
            shadows={shadows}
          />
          {/* After the hall and seats, so everything it compiles is already in the scene. */}
          <ShaderWarmup ready={shadersReady} onDone={onShadersDone} />
          <CameraControls ref={onControlsReady} makeDefault />
        </Canvas>

        {/* Shown until the first frame has actually been drawn */}
        {!ready && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-ink-950" role="status">
            <Spinner className="h-8 w-8 text-brand-400" />
            <p className="text-sm text-gray-300">Preparing your cinema…</p>
          </div>
        )}

        {/* Camera toolbar: one scrollable row, clear of the booking panel */}
        <div
          className="glass scroll-row absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-xl p-1 md:max-w-[calc(100%-320px)]"
          role="toolbar"
          aria-label="Camera views"
        >
          {VIEWS.map(([name, label], i) => (
            <button
              key={name}
              className={`${toolbarBtn(mode === name)} shrink-0`}
              onClick={() => { finishIntro(); goTo(presets[name], name); }}
              aria-pressed={mode === name}
              aria-keyshortcuts={String(i + 1)}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-fill-emphasis" aria-hidden="true" />
          <button className={`${iconBtn} shrink-0`} onClick={() => { finishIntro(); controls()?.dolly(3, animate); }} disabled={mode === "seat"} aria-label="Zoom in" title="Zoom in" aria-keyshortcuts="+">
            <Icon name="plus" className="h-4 w-4" />
          </button>
          <button className={`${iconBtn} shrink-0`} onClick={() => { finishIntro(); controls()?.dolly(-3, animate); }} disabled={mode === "seat"} aria-label="Zoom out" title="Zoom out" aria-keyshortcuts="-">
            <Icon name="minus" className="h-4 w-4" />
          </button>
          <button className={`${toolbarBtn(false)} flex shrink-0 items-center gap-1`} onClick={() => { finishIntro(); goTo(presets.overview, "overview"); }} aria-label="Reset view" title="Reset view" aria-keyshortcuts="0">
            <Icon name="refresh" className="h-3.5 w-3.5" /> Reset
          </button>
          {onToggleLite && (
            <button
              className={`${toolbarBtn(lowPower)} shrink-0`}
              onClick={onToggleLite}
              aria-pressed={lowPower}
              title="Lite mode: lower resolution, no shadows. For slower devices."
            >
              Lite
            </button>
          )}
        </div>

        {/* Trailer controls: outside the scene, never over the screen. On phones
            the seat-view panel takes this spot, so they step aside there. */}
        <TrailerControls
          trailer={trailer}
          className={`absolute left-3 top-14 z-10 ${mode === "seat" ? "hidden md:flex" : ""}`}
        />

        {/* Hints */}
        {!introDone && introProgress < 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center md:right-[300px]">
            <p className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-gray-200">
              <Icon name="chevronDown" className="h-4 w-4 animate-bounce" /> Scroll to fly from the screen to the seats
            </p>
          </div>
        ) : (
          mode !== "seat" && !coarse && (
            <p className="pointer-events-none absolute bottom-3 left-3 hidden rounded-lg bg-ink-950/70 px-2.5 py-1.5 text-2xs text-gray-400 lg:block">
              Drag or arrow keys to look around · Scroll or +/− to zoom · 1–5 views, 0 resets · Click seats to select them
            </p>
          )
        )}

        {/* Touch: explore mode toggle */}
        {coarse && mode !== "seat" && (
          <div className="absolute right-2 top-14 md:bottom-3 md:left-3 md:right-auto md:top-auto">
            <button
              onClick={() => setTouchExplore((v) => !v)}
              aria-pressed={touchExplore}
              className={touchExplore ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
            >
              <Icon name={touchExplore ? "check" : "eye"} className="h-4 w-4" />
              {touchExplore ? "Done exploring" : "Explore in 3D"}
            </button>
            {!touchExplore && <p className="mt-1.5 hidden max-w-[220px] rounded-lg bg-ink-950/70 px-2 py-1 text-2xs text-gray-400 md:block">Tap seats to select. Drag sideways to turn, pinch to zoom. Explore to tilt and pan.</p>}
          </div>
        )}

        {/* Hover tooltip */}
        {hover && mode !== "seat" && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[115%] rounded-xl border border-line-strong bg-ink-900/95 px-3 py-2 text-xs shadow-card"
            style={{ left: hover.x, top: hover.y }}
            role="status"
          >
            <p className="font-semibold text-white">
              {hover.seat.seatNumber} · Row {rowOf(hover.seat.seatNumber)} · Seat {hover.seat.index}
              {hover.seat.seatType === "recliner" && <span className="ml-1.5 badge-accent">Recliner</span>}
            </p>
            <p className="text-gray-400">
              {BLOCK_LABEL[hover.seat.block] ? `${BLOCK_LABEL[hover.seat.block]} · ` : ""}
              {hover.seat.category} · {formatPrice(hover.seat.price)} · <span className="text-gray-200">{STATE_LABEL[hoverState]}</span>
            </p>
          </div>
        )}

        {/* Floating booking panel */}
        <aside
          className="glass absolute inset-x-2 bottom-2 z-10 flex max-h-[72%] flex-col overflow-hidden rounded-2xl md:inset-x-auto md:bottom-3 md:right-3 md:top-3 md:max-h-none md:w-[290px]"
          aria-label="Your booking"
          data-testid="booking-panel"
        >
          <div id="booking-sheet-details" className={`${sheetOpen ? "" : "hidden"} border-b border-line p-4 md:block`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Your seats</h3>
              <span className="text-xs text-gray-400">{selected.length} of {maxSeats}</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{availableCount} of {hall.seatCount} seats still available</p>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-gray-400" aria-label="Seat colours" data-testid="seat-legend-3d">
              {LEGEND.map(([state, label]) => (
                <li key={state} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-white/20" style={{ background: colors[state] }} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
            <form onSubmit={submitFinder} className="mt-3 flex gap-1.5">
              <label htmlFor="seat-finder" className="sr-only">Seat number</label>
              <input
                id="seat-finder"
                value={finder}
                onChange={(e) => {
                  setFinder(e.target.value);
                  setFinderMsg("");
                }}
                placeholder="Go to seat, e.g. F6"
                className="input flex-1 py-1.5 text-xs uppercase"
                autoComplete="off"
              />
              <button type="submit" className="btn-secondary btn-sm px-2.5" aria-label="Find seat">
                <Icon name="search" className="h-4 w-4" />
              </button>
            </form>
            {finderMsg && <p className="mt-1.5 text-2xs text-gold-400" role="alert">{finderMsg}</p>}
          </div>

          <div className={`${sheetOpen ? "" : "hidden"} min-h-0 flex-1 overflow-y-auto p-2 md:block`}>
            {selectedSeats.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-gray-500">Click a seat in the hall to select it.</p>
            ) : (
              <ul className="space-y-1">
                {selectedSeats.map((s) => (
                  <li key={s.seatNumber} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${viewSeat?.seatNumber === s.seatNumber ? "bg-brand-500/15" : "hover:bg-fill"}`}>
                    <span className="flex h-8 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 font-mono text-xs font-bold text-brand-200">{s.seatNumber}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-white">
                        {s.category}{s.seatType === "recliner" ? " · Recliner" : ""}
                      </span>
                      <span className="text-xs text-gray-400">{formatPrice(s.price)}</span>
                    </span>
                    <button className={iconBtn} onClick={() => enterSeatView(s)} aria-label={`Preview the view from ${s.seatNumber}`}>
                      <Icon name="eye" className="h-4 w-4" />
                    </button>
                    <button className={`${iconBtn} hover:text-danger-300`} onClick={() => onToggle(s)} aria-label={`Remove ${s.seatNumber}`}>
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2.5 border-t border-line p-3 md:p-4">
            <button
              type="button"
              onClick={() => setSheetOpen((v) => !v)}
              aria-expanded={sheetOpen}
              aria-controls="booking-sheet-details"
              className="flex w-full items-center justify-between text-xs font-semibold text-brand-300 md:hidden"
            >
              {sheetOpen ? "Hide seat details" : "Show seats, finder and preview"}
              <Icon name="chevronDown" className={`h-4 w-4 transition ${sheetOpen ? "rotate-180" : ""}`} />
            </button>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-400">{selected.length} {selected.length === 1 ? "ticket" : "tickets"}</span>
              <span className="font-display text-xl font-bold text-white">{formatPrice(total)}</span>
            </div>
            <HoldCountdown hold={hold} selectedCount={selected.length} onRenew={onRenewHold} />
            <button onClick={onContinue} disabled={!selected.length || continuing} className="btn-primary w-full">
              {continuing ? <><Spinner className="h-4 w-4" /> Holding seats…</> : <>Continue <Icon name="arrowRight" className="h-4 w-4" /></>}
            </button>
            {selected.length > 0 && (
              <button onClick={onClear} className="btn-ghost btn-sm w-full">Clear selection</button>
            )}
          </div>
        </aside>

        {/* First-person seat view */}
        {mode === "seat" && viewSeat && info && (
          <div className="glass absolute left-2 right-2 top-14 z-10 rounded-2xl p-3 md:bottom-3 md:left-3 md:right-[306px] md:top-auto md:w-[330px] md:p-4" aria-live="polite" data-testid="seat-view-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">View from your seat</p>
                <p className="mt-1 font-display text-lg font-bold text-white">
                  Row {rowOf(viewSeat.seatNumber)} · Seat {viewSeat.index}
                </p>
                <p className="text-xs text-gray-400">
                  {BLOCK_LABEL[viewSeat.block] ? `${BLOCK_LABEL[viewSeat.block]} · ` : ""}
                  {viewSeat.category}
                  {viewSeat.seatType === "recliner" ? " · Recliner" : ""} · {formatPrice(viewSeat.price)}
                </p>
              </div>
              <span className="badge-brand shrink-0">{info.viewLabel.split(":")[0]}</span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-fill p-2"><dt className="text-3xs text-gray-500">To screen</dt><dd className="text-sm font-semibold text-white">{info.distance} m</dd></div>
              <div className="rounded-lg bg-fill p-2"><dt className="text-3xs text-gray-500">Off centre</dt><dd className="text-sm font-semibold text-white">{Math.abs(info.horizontalAngle)}°</dd></div>
              <div className="rounded-lg bg-fill p-2"><dt className="text-3xs text-gray-500">Screen fills</dt><dd className="text-sm font-semibold text-white">{info.screenWidthAngle}°</dd></div>
            </dl>
            {selectedSeats.length > 1 && (
              <div className="mt-3">
                <p className="mb-1.5 text-2xs text-gray-500">Compare your seats</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSeats.map((s) => (
                    <button key={s.seatNumber} onClick={() => enterSeatView(s)} aria-pressed={s.seatNumber === viewSeat.seatNumber} className={`chip px-3 py-1 ${s.seatNumber === viewSeat.seatNumber ? "chip-active" : ""}`}>
                      {s.seatNumber}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-3 hidden text-2xs text-gray-500 md:block">Drag or use the arrow keys to look around a little.</p>
            <button onClick={exitSeatView} className="btn-secondary btn-sm mt-2 w-full">
              <Icon name="arrowLeft" className="h-4 w-4" /> Back to the auditorium
            </button>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {selected.length} of {maxSeats} seats selected{selected.length ? `: ${selected.join(", ")}` : ""}.
      </p>
    </div>
  );
}
