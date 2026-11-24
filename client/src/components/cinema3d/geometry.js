// geometry.js
// Procedural cinema-chair models. Each chair type has two merged geometries:
// "upholstery" (coloured per seat state) and "frame" (dark metal, never changes).
// Origin: floor level under the middle of the seat; the chair faces the screen
// (towards -z). Units are metres.

import { BoxGeometry, CylinderGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const rounded = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));

const place = (geo, { x = 0, y = 0, z = 0, rx = 0 } = {}) => {
  if (rx) geo.rotateX(rx);
  geo.translate(x, y, z);
  return geo;
};

// Merge parts that may have different index/attribute layouts.
const merge = (parts) => {
  const prepared = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  prepared.forEach((g) => {
    if (g.attributes.uv === undefined) return;
    g.deleteAttribute("uv");
  });
  const merged = mergeGeometries(prepared, false);
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
};

/** Standard seat: cushion, reclined backrest and armrests on a pedestal. */
function standardChair(seatWidth) {
  const w = seatWidth * 0.9;
  const upholstery = merge([
    place(rounded(w - 0.1, 0.13, 0.5, 0.05), { y: 0.46, z: 0.02 }),
    place(rounded(w - 0.1, 0.66, 0.11, 0.05), { y: 0.84, z: 0.26, rx: 0.18 }),
  ]);
  const armX = w / 2 - 0.035;
  const frame = merge([
    place(rounded(0.07, 0.07, 0.52, 0.03), { x: armX, y: 0.66, z: 0.06 }),
    place(rounded(0.07, 0.07, 0.52, 0.03), { x: -armX, y: 0.66, z: 0.06 }),
    place(new BoxGeometry(0.05, 0.62, 0.08), { x: armX, y: 0.31, z: 0.12 }),
    place(new BoxGeometry(0.05, 0.62, 0.08), { x: -armX, y: 0.31, z: 0.12 }),
    place(new BoxGeometry(w * 0.5, 0.05, 0.36), { y: 0.025, z: 0.08 }),
    place(new CylinderGeometry(0.035, 0.05, 0.38, 10), { y: 0.21, z: 0.06 }),
  ]);
  return { upholstery, frame };
}

/** Recliner: wider and deeper, padded arms, headrest and a raised footrest. */
function reclinerChair(seatWidth) {
  const w = seatWidth * 0.92;
  const armW = 0.13;
  const inner = w - armW * 2;
  const upholstery = merge([
    place(rounded(inner, 0.2, 0.62, 0.07), { y: 0.43, z: 0.02 }),
    place(rounded(inner, 0.78, 0.18, 0.08), { y: 0.86, z: 0.34, rx: 0.32 }),
    place(rounded(inner * 0.8, 0.16, 0.14, 0.06), { y: 1.25, z: 0.5, rx: 0.32 }),
    place(rounded(inner * 0.95, 0.1, 0.36, 0.05), { y: 0.36, z: -0.42, rx: -0.35 }),
    place(rounded(armW, 0.5, 0.78, 0.06), { x: w / 2 - armW / 2, y: 0.42, z: 0.08 }),
    place(rounded(armW, 0.5, 0.78, 0.06), { x: -(w / 2 - armW / 2), y: 0.42, z: 0.08 }),
  ]);
  const frame = merge([
    place(new BoxGeometry(w * 0.96, 0.1, 0.8), { y: 0.05, z: 0.08 }),
    place(rounded(0.1, 0.04, 0.14, 0.02), { x: w / 2 - armW / 2, y: 0.69, z: -0.18 }),
  ]);
  return { upholstery, frame };
}

export function buildChairGeometries(geometry) {
  return {
    standard: standardChair(geometry.seatWidth.standard),
    recliner: reclinerChair(geometry.seatWidth.recliner || geometry.seatWidth.standard),
  };
}
