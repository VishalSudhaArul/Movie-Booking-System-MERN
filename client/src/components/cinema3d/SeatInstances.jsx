import React, { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Object3D } from "three";
import { useThree } from "@react-three/fiber";
import { buildChairGeometries } from "./geometry";
import { useThemeColors } from "../../lib/theme";

// Upholstery colour per seat state. The 2D legend and the 3D tooltip use the
// same words, so state is never shown by colour alone. "selected" and
// "premium" follow the colour theme (see useSeatColors); the others are fixed.
export const SEAT_COLORS = {
  available: "#4a5570",
  premium: "#7b4fd6",
  selected: "#1e8cff",
  booked: "#171b26",
  reserved: "#2b5576",
};
const HOVER_LIFT = 0.35;

/** Seat colours for the current colour theme. */
function useSeatColors() {
  const theme = useThemeColors(["brand-500", "accent-600"]);
  return useMemo(
    () => ({ ...SEAT_COLORS, selected: theme["brand-500"], premium: theme["accent-600"] }),
    [theme]
  );
}

export const seatState = (seat, selected, premiumCategory) => {
  if (selected) return "selected";
  if (seat.reserved) return "reserved";
  if (seat.isBooked) return "booked";
  if (premiumCategory && seat.category === premiumCategory) return "premium";
  return "available";
};

const tmp = new Object3D();
const color = new Color();
const white = new Color("#ffffff");

/**
 * All seats of one chair type, drawn with two instanced meshes (upholstery and
 * frame). Hover and click resolve the seat from the instance id.
 */
function ChairGroup({ seats, geo, colors, selectedSet, premiumCategory, hoveredSeat, onHover, onPick, shadows }) {
  const upholsteryRef = useRef();
  const frameRef = useRef();
  const invalidate = useThree((s) => s.invalidate);

  // Positions only change when the seat list changes.
  useLayoutEffect(() => {
    seats.forEach((seat, i) => {
      tmp.position.set(seat.x, seat.floorY, seat.z);
      tmp.rotation.set(0, 0, 0);
      tmp.updateMatrix();
      upholsteryRef.current.setMatrixAt(i, tmp.matrix);
      frameRef.current.setMatrixAt(i, tmp.matrix);
    });
    upholsteryRef.current.instanceMatrix.needsUpdate = true;
    frameRef.current.instanceMatrix.needsUpdate = true;
    upholsteryRef.current.computeBoundingSphere();
    invalidate();
  }, [seats, invalidate]);

  // Colours follow seat state, selection and hover.
  useLayoutEffect(() => {
    seats.forEach((seat, i) => {
      const state = seatState(seat, selectedSet.has(seat.seatNumber), premiumCategory);
      color.set(colors[state]);
      if (hoveredSeat === seat.seatNumber && state !== "booked" && state !== "reserved") color.lerp(white, HOVER_LIFT);
      upholsteryRef.current.setColorAt(i, color);
    });
    if (upholsteryRef.current.instanceColor) upholsteryRef.current.instanceColor.needsUpdate = true;
    invalidate();
  }, [seats, colors, selectedSet, premiumCategory, hoveredSeat, invalidate]);

  if (seats.length === 0) return null;

  const seatAt = (e) => (e.instanceId === undefined ? null : seats[e.instanceId]);

  return (
    <group>
      <instancedMesh
        ref={upholsteryRef}
        args={[geo.upholstery, undefined, seats.length]}
        castShadow={shadows}
        receiveShadow={shadows}
        onPointerMove={(e) => {
          e.stopPropagation();
          const seat = seatAt(e);
          if (seat) onHover(seat, e);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          // A drag to rotate the camera ends with a click; ignore those.
          if (e.delta > 6) return;
          const seat = seatAt(e);
          if (seat) onPick(seat);
        }}
      >
        <meshStandardMaterial roughness={0.82} metalness={0.05} />
      </instancedMesh>
      {/* The thin metal frame doesn't cast shadows: barely visible, and it halves the shadow pass. */}
      <instancedMesh ref={frameRef} args={[geo.frame, undefined, seats.length]} raycast={() => null}>
        <meshStandardMaterial color="#20242e" roughness={0.45} metalness={0.6} />
      </instancedMesh>
    </group>
  );
}

export default function SeatInstances({ hall, selected, premiumCategory, hoveredSeat, onHover, onPick, shadows }) {
  const geos = useMemo(() => buildChairGeometries(hall.geometry), [hall.geometry]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const { standard, recliner } = useMemo(() => {
    const all = hall.rows.flatMap((r) => r.seats);
    return {
      standard: all.filter((s) => s.seatType !== "recliner"),
      recliner: all.filter((s) => s.seatType === "recliner"),
    };
  }, [hall]);

  const colors = useSeatColors();
  const shared = { colors, selectedSet, premiumCategory, hoveredSeat, onHover, onPick, shadows };
  return (
    <group>
      <ChairGroup seats={standard} geo={geos.standard} {...shared} />
      <ChairGroup seats={recliner} geo={geos.recliner} {...shared} />
    </group>
  );
}

