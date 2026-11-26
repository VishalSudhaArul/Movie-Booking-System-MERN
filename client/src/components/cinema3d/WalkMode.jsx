import React, { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils } from "three";
import { STANDING_EYE, describePosition, floorAt, isWalkable, startPoint, step } from "../../lib/walkway";

// Walk-through mode: a first-person visitor who can only stand where the hall
// leaves room — the aisles, side walkways and the cross-aisles front and rear
// (see lib/walkway.js). Movement: WASD / arrow keys, a touch joystick, drag to
// look around. The camera is driven directly here; the orbit camera controls
// are unmounted while walking so they can't fight over it.

const WALK_SPEED = 1.5; // m/s
const RUN_SPEED = 3; // m/s with Shift
const TURN_SPEED = 1.8; // rad/s for keyboard turning
const LOOK_SPEED = 0.0045; // rad per pixel dragged
const PITCH_LIMIT = MathUtils.degToRad(60);
const ROUTE_SPEED = 2.2; // m/s when walking to a seat automatically

/** Shared input state: keys held, joystick vector. Mutated by the overlay. */
export function useWalkInput() {
  return useRef({ forward: 0, back: 0, left: 0, right: 0, turnLeft: 0, turnRight: 0, run: false, joyX: 0, joyY: 0 });
}

const KEYS = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  KeyD: "right",
  ArrowLeft: "turnLeft",
  KeyQ: "turnLeft",
  ArrowRight: "turnRight",
  KeyE: "turnRight",
};

/** Keyboard input while walk mode is on (ignored while typing in a field). */
export function useWalkKeys(active, input, onExit, kick) {
  useEffect(() => {
    if (!active) return undefined;
    const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || "") || e.target?.isContentEditable;
    const down = (e) => {
      if (typing(e)) return;
      if (e.key === "Escape") return onExit();
      if (e.key === "Shift") input.current.run = true;
      const k = KEYS[e.code];
      if (!k) return;
      e.preventDefault();
      input.current[k] = 1;
      kick();
    };
    const up = (e) => {
      if (e.key === "Shift") input.current.run = false;
      const k = KEYS[e.code];
      if (k) input.current[k] = 0;
    };
    const clear = () => Object.keys(KEYS).forEach((c) => (input.current[KEYS[c]] = 0));
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [active, input, onExit, kick]);
}

/**
 * Inside the canvas: moves the camera. `api` receives { kick, walkTo, getPose }
 * so the overlay can start movement and automatic routes.
 */
export function WalkControls({ area, input, onPosition, onArrive, apiRef, reducedMotion }) {
  const { camera, gl, invalidate } = useThree();
  const pose = useRef(null);
  const route = useRef([]);
  const lastLabel = useRef("");

  if (!pose.current) {
    const s = startPoint(area);
    pose.current = { x: s.x, z: s.z, y: floorAt(area, s.z) + STANDING_EYE, yaw: s.yaw, pitch: -0.05 };
  }

  const apply = useCallback(() => {
    const p = pose.current;
    camera.position.set(p.x, p.y, p.z);
    camera.rotation.set(p.pitch, p.yaw, 0, "YXZ");
    camera.updateMatrixWorld();
    const label = describePosition(area, p.x, p.z);
    if (label !== lastLabel.current) {
      lastLabel.current = label;
      onPosition(label);
    }
  }, [camera, area, onPosition]);

  // Place the camera once, and restore its rotation order when walk mode ends.
  useEffect(() => {
    apply();
    invalidate();
    return () => camera.rotation.set(camera.rotation.x, camera.rotation.y, camera.rotation.z, "XYZ");
  }, [apply, invalidate, camera]);

  useEffect(() => {
    apiRef.current = {
      kick: () => invalidate(),
      walkTo: (waypoints, onDone) => {
        if (reducedMotion) {
          // No animated walking: go straight there.
          const last = waypoints[waypoints.length - 1];
          if (last) {
            pose.current.x = last.x;
            pose.current.z = last.z;
            pose.current.y = floorAt(area, last.z) + STANDING_EYE;
          }
          apply();
          invalidate();
          onDone?.();
          return;
        }
        route.current = waypoints.map((w) => ({ ...w }));
        route.current.onDone = onDone;
        invalidate();
      },
      face: (x, z) => {
        const p = pose.current;
        p.yaw = Math.atan2(-(x - p.x), -(z - p.z));
        apply();
        invalidate();
      },
      getPose: () => ({ ...pose.current }),
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, invalidate, apply, area, reducedMotion]);

  // Drag (mouse or touch) to look around.
  useEffect(() => {
    const el = gl.domElement;
    let last = null;
    const down = (e) => {
      last = { x: e.clientX, y: e.clientY, id: e.pointerId };
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (!last || e.pointerId !== last.id) return;
      const p = pose.current;
      p.yaw -= (e.clientX - last.x) * LOOK_SPEED;
      p.pitch = MathUtils.clamp(p.pitch - (e.clientY - last.y) * LOOK_SPEED, -PITCH_LIMIT, PITCH_LIMIT);
      last = { x: e.clientX, y: e.clientY, id: e.pointerId };
      apply();
      invalidate();
    };
    const up = (e) => {
      if (last && e.pointerId === last.id) last = null;
    };
    const prevTouch = el.style.touchAction;
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.style.touchAction = prevTouch;
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl, apply, invalidate]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const p = pose.current;
    const inp = input.current;
    let busy = false;

    if (route.current.length) {
      busy = true;
      const target = route.current[0];
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const dist = Math.hypot(dx, dz);
      const stepLen = ROUTE_SPEED * dt;
      if (dist <= stepLen) {
        p.x = target.x;
        p.z = target.z;
        const done = route.current.onDone;
        route.current.shift();
        if (!route.current.length) {
          route.current = [];
          onArrive?.();
          done?.();
        }
      } else {
        p.x += (dx / dist) * stepLen;
        p.z += (dz / dist) * stepLen;
        // Face the direction of travel, smoothly.
        const want = Math.atan2(-dx, -dz);
        const diff = Math.atan2(Math.sin(want - p.yaw), Math.cos(want - p.yaw));
        p.yaw += diff * Math.min(1, dt * 6);
      }
    } else {
      const turn = inp.turnRight - inp.turnLeft;
      if (turn) {
        p.yaw -= turn * TURN_SPEED * dt;
        busy = true;
      }
      const f = MathUtils.clamp(inp.forward - inp.back + inp.joyY, -1, 1);
      const r = MathUtils.clamp(inp.right - inp.left + inp.joyX, -1, 1);
      if (f || r) {
        busy = true;
        const speed = (inp.run ? RUN_SPEED : WALK_SPEED) * dt;
        const sin = Math.sin(p.yaw);
        const cos = Math.cos(p.yaw);
        // Forward is -z at yaw 0; right is +x.
        const dx = (-sin * f + cos * r) * speed;
        const dz = (-cos * f - sin * r) * speed;
        const next = step(area, p.x, p.z, dx, dz);
        p.x = next.x;
        p.z = next.z;
      }
    }

    // Ease the eye height up and down the steps.
    const wantY = floorAt(area, p.z) + STANDING_EYE;
    if (Math.abs(wantY - p.y) > 0.005) {
      p.y += (wantY - p.y) * Math.min(1, dt * 8);
      busy = true;
    } else p.y = wantY;

    if (busy) {
      apply();
      invalidate(); // keep frames coming while moving (the canvas renders on demand)
    }
  });

  return null;
}

/** On-screen joystick for touch screens. Writes a -1…1 vector into the walk input. */
export function TouchJoystick({ input, onMove }) {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const active = useRef(null);
  const RADIUS = 44;

  const set = (x, y) => {
    input.current.joyX = x;
    input.current.joyY = y;
    if (knobRef.current) knobRef.current.style.transform = `translate(${x * RADIUS}px, ${-y * RADIUS}px)`;
    onMove();
  };
  const update = (e) => {
    const r = baseRef.current.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / RADIUS;
    let y = -(e.clientY - (r.top + r.height / 2)) / RADIUS;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    set(x, y);
  };
  useEffect(() => () => set(0, 0), []); // release the joystick on unmount

  return (
    <div
      ref={baseRef}
      className="relative h-28 w-28 touch-none select-none rounded-full border border-line-strong bg-ink-950/60"
      role="application"
      aria-label="Movement joystick: drag to walk"
      data-testid="walk-joystick"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => e.pointerId === active.current && update(e)}
      onPointerUp={() => {
        active.current = null;
        set(0, 0);
      }}
      onPointerCancel={() => {
        active.current = null;
        set(0, 0);
      }}
    >
      <span ref={knobRef} className="absolute left-1/2 top-1/2 -ml-6 -mt-6 h-12 w-12 rounded-full bg-brand-solid/80 shadow-card" aria-hidden="true" />
    </div>
  );
}

export { isWalkable };
