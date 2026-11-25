import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { Box3, MathUtils, Vector3 } from "three";
import HallScene from "./HallScene";
import SeatInstances, { seatState } from "./SeatInstances";
import Icon from "../ui/Icon";
import HoldCountdown from "../HoldCountdown";
import { Spinner } from "../ui/Feedback";
import { buildAuditorium, viewingInfo } from "../../lib/auditorium";
import { formatPrice } from "../../lib/format";
import { getRendererName } from "../../lib/webgl";

const { ACTION } = CameraControlsImpl;
const INTRO_SCROLL = 420; // px of page scroll that fly the camera from the stage to the seats
const STATE_LABEL = { available: "Available", premium: "Available", selected: "Selected", booked: "Booked", reserved: "Reserved" };

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Camera positions derived from the hall's real dimensions. */
function usePresets(hall) {
  return useMemo(() => {
    const rows = hall.rows;
    const front = rows[0].z;
    const back = rows[rows.length - 1].z;
    const mid = (front + back) / 2;
    const { room, screen } = hall;
    const screenCenter = [0, screen.bottom + screen.height / 2, 0];
    return {
      screenCenter,
      overview: { pos: [room.width * 0.22, room.height * 0.95, Math.min(room.depth - 0.5, back + 5)], target: [0, 1.4, mid * 0.75] },
      map: { pos: [0, room.height + 13, mid + 3.5], target: [0, 1.2, mid + 1.5] },
      screen: { pos: [0, 3.2, mid], target: screenCenter },
      stage: { pos: [0, screen.bottom + 0.9, 2.6], target: [0, 2.6, mid + 4] },
      bounds: new Box3(new Vector3(-room.width / 2, 0, -1), new Vector3(room.width / 2, room.height, room.depth)),
    };
  }, [hall]);
}

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
  reducedMotion = false,
  lowPower = false,
}) {
  // Startup timings (ms since page start): mounted → canvas created → first frame.
  const timingsRef = useRef({ mounted: performance.now() });
  const onCanvasCreated = useCallback(() => {
    timingsRef.current.canvasCreated = performance.now();
  }, []);
  const [ready, setReady] = useState(false);
  const onFirstFrame = useCallback((t) => {
    timingsRef.current.firstFrame = t;
    setReady(true);
  }, []);
  const hall = useMemo(() => buildAuditorium(layout, seats), [layout, seats]);
  const presets = usePresets(hall);
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
    c.maxDistance = 42;
    c.minPolarAngle = 0.12;
    c.maxPolarAngle = Math.PI / 2 - 0.03;
    c.minAzimuthAngle = -Infinity; // full 360° rotation
    c.maxAzimuthAngle = Infinity;
    c.setBoundary(presets.bounds);
  }, [presets]);

  // The booking panel covers the right of the view on wider screens: shift the
  // framing left so the hall stays centred in the visible area.
  const panelOffset = useCallback(() => {
    const w = stageRef.current?.clientWidth || 0;
    return w >= 768 ? Math.min(3.2, (290 / w) * 9) : 0;
  }, []);

  const goTo = useCallback(
    (preset, nextMode, transition = animate) => {
      const c = controls();
      if (!c) return;
      freeLimits();
      c.setFocalOffset(panelOffset(), 0, 0, transition);
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
      c.mouseButtons.wheel = ACTION.NONE; // plain wheel scrolls the page
      c.mouseButtons.right = ACTION.TRUCK;
      c.mouseButtons.middle = ACTION.DOLLY;
      c.smoothTime = animate ? 0.45 : 0;
      c.draggingSmoothTime = animate ? 0.12 : 0;
      c.azimuthRotateSpeed = 0.6;
      c.polarRotateSpeed = 0.6;
      freeLimits();
      const start = introDone ? presets.overview : presets.stage;
      c.setFocalOffset(panelOffset(), 0, 0, false);
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

  // Ctrl/⌘ + wheel zooms (plain wheel keeps scrolling the page).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey) || mode === "seat") return;
      e.preventDefault();
      finishIntro();
      controls()?.dolly(-e.deltaY * 0.02, animate);
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
          drawCalls: info?.calls,
          timings: { ...timingsRef.current },
          renderer: getRendererName(),
          lowPower,
          programs: sceneRef.current?.gl.info.programs?.length,
          triangles: info?.triangles,
        };
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
      goTo: (name) => (name === "seat" ? null : goTo(presets[name], name, false)),
    };
    return () => {
      delete window.__cinema3d;
    };
  }, [mode, introDone, viewSeat, hall, goTo, presets]);

  /* ---------- Keyboard navigation (when the 3D view has focus) ---------- */

  const KEY_STEP = MathUtils.degToRad(15);
  const onKeyDown = (e) => {
    if (e.target !== e.currentTarget) return; // typing in the seat finder, a button, etc.
    const c = controls();
    if (!c) return;
    const presetKeys = { 1: ["overview", presets.overview], 2: ["map", presets.map], 3: ["screen", presets.screen] };
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
    // Locked: one finger scrolls the page and taps still select seats.
    c.touches.one = touchExplore ? ACTION.TOUCH_ROTATE : ACTION.NONE;
    c.touches.two = touchExplore ? ACTION.TOUCH_DOLLY_TRUCK : ACTION.NONE;
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
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-brand-gradient text-on-brand" : "text-gray-300 hover:bg-white/10 hover:text-white"}`;
  const iconBtn = "rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-40";

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
        aria-label="3D auditorium. Use the arrow keys to look around, plus and minus to zoom, 0 to reset, 1 2 3 for views. Use the seat finder to pick seats by number."
        onKeyDown={onKeyDown}
      >
        <Canvas
          frameloop="demand"
          shadows={shadows ? "percentage" : false}
          dpr={lowPower ? 1 : [1, 1.75]}
          camera={{ fov: 52, near: 0.05, far: 120, position: presets.stage.pos }}
          gl={{ antialias: !lowPower, powerPreference: "high-performance" }}
          onPointerMissed={() => setHover(null)}
          onCreated={onCanvasCreated}
          aria-hidden="true"
        >
          <color attach="background" args={["#04060d"]} />
          <fog attach="fog" args={["#04060d", 40, 95]} />
          <SceneBridge onReady={handleSceneReady} />
          <FirstFrame onFirstFrame={onFirstFrame} />
          <HallScene hall={hall} movieTitle={movieTitle} shadows={shadows} topView={mode === "map"} />
          <SeatInstances
            hall={hall}
            selected={selected}
            premiumCategory={premiumCategory}
            hoveredSeat={hover?.seat.seatNumber}
            onHover={handleHover}
            onPick={handlePick}
            shadows={shadows}
          />
          <CameraControls ref={onControlsReady} makeDefault />
        </Canvas>

        {/* Shown until the first frame has actually been drawn */}
        {!ready && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-ink-950" role="status">
            <Spinner className="h-8 w-8 text-brand-400" />
            <p className="text-sm text-gray-300">Preparing your cinema…</p>
          </div>
        )}

        {/* Camera toolbar */}
        <div className="glass absolute left-3 top-3 flex flex-wrap items-center gap-1 rounded-xl p-1" role="toolbar" aria-label="Camera">
          <button className={toolbarBtn(mode === "overview")} onClick={() => goTo(presets.overview, "overview")} aria-keyshortcuts="1">Overview</button>
          <button className={toolbarBtn(mode === "map")} onClick={() => goTo(presets.map, "map")} aria-keyshortcuts="2">Seat map</button>
          <button className={toolbarBtn(mode === "screen")} onClick={() => goTo(presets.screen, "screen")} aria-keyshortcuts="3">Screen</button>
          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden="true" />
          <button className={iconBtn} onClick={() => controls()?.dolly(3, animate)} disabled={mode === "seat"} aria-label="Zoom in" aria-keyshortcuts="+">
            <Icon name="plus" className="h-4 w-4" />
          </button>
          <button className={iconBtn} onClick={() => controls()?.dolly(-3, animate)} disabled={mode === "seat"} aria-label="Zoom out" aria-keyshortcuts="-">
            <Icon name="minus" className="h-4 w-4" />
          </button>
          <button className={iconBtn} onClick={() => { finishIntro(); goTo(presets.overview, "overview"); }} aria-label="Reset camera" aria-keyshortcuts="0">
            <Icon name="refresh" className="h-4 w-4" />
          </button>
        </div>

        {/* Hints */}
        {!introDone && introProgress < 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center md:right-[300px]">
            <p className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs text-gray-200">
              <Icon name="chevronDown" className="h-4 w-4 animate-bounce" /> Scroll to fly from the screen to the seats
            </p>
          </div>
        ) : (
          mode !== "seat" && !coarse && (
            <p className="pointer-events-none absolute bottom-3 left-3 hidden rounded-lg bg-ink-950/70 px-2.5 py-1.5 text-[11px] text-gray-400 lg:block">
              Drag or arrow keys to look around · Ctrl/⌘ + scroll or +/− to zoom · Click a seat to select it
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
            {!touchExplore && <p className="mt-1.5 hidden max-w-[220px] rounded-lg bg-ink-950/70 px-2 py-1 text-[11px] text-gray-400 md:block">Tap a seat to select it. Explore to rotate and pinch-zoom.</p>}
          </div>
        )}

        {/* Hover tooltip */}
        {hover && mode !== "seat" && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[115%] rounded-xl border border-white/10 bg-ink-900/95 px-3 py-2 text-xs shadow-card"
            style={{ left: hover.x, top: hover.y }}
            role="status"
          >
            <p className="font-semibold text-white">
              Row {rowOf(hover.seat.seatNumber)} · Seat {hover.seat.index}
              {hover.seat.seatType === "recliner" && <span className="ml-1.5 badge-accent">Recliner</span>}
            </p>
            <p className="text-gray-400">
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
          <div id="booking-sheet-details" className={`${sheetOpen ? "" : "hidden"} border-b border-white/[0.07] p-4 md:block`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Your seats</h3>
              <span className="text-xs text-gray-400">{selected.length} of {maxSeats}</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{availableCount} seats still available</p>
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
            {finderMsg && <p className="mt-1.5 text-[11px] text-gold-400" role="alert">{finderMsg}</p>}
          </div>

          <div className={`${sheetOpen ? "" : "hidden"} min-h-0 flex-1 overflow-y-auto p-2 md:block`}>
            {selectedSeats.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-gray-500">Click a seat in the hall to select it.</p>
            ) : (
              <ul className="space-y-1">
                {selectedSeats.map((s) => (
                  <li key={s.seatNumber} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${viewSeat?.seatNumber === s.seatNumber ? "bg-brand-500/15" : "hover:bg-white/[0.04]"}`}>
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

          <div className="space-y-2.5 border-t border-white/[0.07] p-3 md:p-4">
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
                  {viewSeat.category}
                  {viewSeat.seatType === "recliner" ? " · Recliner" : ""} · {formatPrice(viewSeat.price)}
                </p>
              </div>
              <span className="badge-brand shrink-0">{info.viewLabel.split(":")[0]}</span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-white/[0.04] p-2"><dt className="text-[10px] text-gray-500">To screen</dt><dd className="text-sm font-semibold text-white">{info.distance} m</dd></div>
              <div className="rounded-lg bg-white/[0.04] p-2"><dt className="text-[10px] text-gray-500">Off centre</dt><dd className="text-sm font-semibold text-white">{Math.abs(info.horizontalAngle)}°</dd></div>
              <div className="rounded-lg bg-white/[0.04] p-2"><dt className="text-[10px] text-gray-500">Screen fills</dt><dd className="text-sm font-semibold text-white">{info.screenWidthAngle}°</dd></div>
            </dl>
            {selectedSeats.length > 1 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] text-gray-500">Compare your seats</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSeats.map((s) => (
                    <button key={s.seatNumber} onClick={() => enterSeatView(s)} aria-pressed={s.seatNumber === viewSeat.seatNumber} className={`chip px-3 py-1 ${s.seatNumber === viewSeat.seatNumber ? "chip-active" : ""}`}>
                      {s.seatNumber}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-3 hidden text-[11px] text-gray-500 md:block">Drag or use the arrow keys to look around a little.</p>
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
