// HallInstances.jsx
// Repeated hall parts (risers, aisle strips, step lights, wall panels, row
// letters…) drawn as one instanced mesh or one merged mesh each, so a 25-row
// multiplex costs the same number of draw calls as a 12-row hall.

import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, CanvasTexture, Color, Object3D, SRGBColorSpace } from "three";

const tmp = new Object3D();
const tint = new Color();

/**
 * items: [{ p: [x, y, z], s: [sx, sy, sz], r?: [rx, ry, rz], color? }]
 * children: the geometry and material (geometry sized 1 × 1 × 1).
 */
export function Instances({ items, children, castShadow = false, receiveShadow = false }) {
  const ref = useRef();
  const invalidate = useThree((s) => s.invalidate);
  const colored = items.some((i) => i.color);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((item, i) => {
      tmp.position.set(...item.p);
      tmp.rotation.set(...(item.r || [0, 0, 0]));
      tmp.scale.set(...(item.s || [1, 1, 1]));
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      if (colored) mesh.setColorAt(i, tint.set(item.color || "#ffffff"));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [items, colored, invalidate]);

  if (!items.length) return null;
  // Recreated when the count changes (an instanced mesh has a fixed capacity).
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[undefined, undefined, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      raycast={() => null}
      frustumCulled={false}
    >
      {children}
    </instancedMesh>
  );
}

/* ---------------- Row letters ---------------- */

const CELL = 64;
const GRID = 8; // 8 × 8 cells: room for 64 labels (rows use at most 25, plus "AA"-style)

function useLabelAtlas(labels, colors) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = CELL * GRID;
    canvas.height = CELL * GRID;
    const ctx = canvas.getContext("2d");
    labels.forEach((label, i) => {
      const x = (i % GRID) * CELL;
      const y = Math.floor(i / GRID) * CELL;
      ctx.fillStyle = colors.plate;
      ctx.beginPath();
      const r = 12;
      ctx.moveTo(x + r + 4, y + 4);
      ctx.arcTo(x + CELL - 4, y + 4, x + CELL - 4, y + CELL - 4, r);
      ctx.arcTo(x + CELL - 4, y + CELL - 4, x + 4, y + CELL - 4, r);
      ctx.arcTo(x + 4, y + CELL - 4, x + 4, y + 4, r);
      ctx.arcTo(x + 4, y + 4, x + CELL - 4, y + 4, r);
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `800 ${label.length > 1 ? 28 : 38}px Inter, system-ui, sans-serif`;
      ctx.fillText(label, x + CELL / 2, y + CELL / 2 + 2);
    });
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [labels, colors.plate, colors.text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/**
 * Row letters on the aisle ends of the seats, facing the back of the hall
 * (where people walk in), all in one draw call.
 * plaques: [{ label, x, y, z }]
 */
export function RowLetters({ plaques, size = 0.3, plate = "#0b1020", text = "#c7d2fe" }) {
  const labels = useMemo(() => [...new Set(plaques.map((p) => p.label))].slice(0, GRID * GRID), [plaques]);
  const colors = useMemo(() => ({ plate, text }), [plate, text]);
  const texture = useLabelAtlas(labels, colors);

  const geometry = useMemo(() => {
    const usable = plaques.filter((p) => labels.includes(p.label));
    const pos = new Float32Array(usable.length * 4 * 3);
    const uv = new Float32Array(usable.length * 4 * 2);
    const index = [];
    const h = size / 2;
    usable.forEach((p, i) => {
      const cell = labels.indexOf(p.label);
      const u0 = (cell % GRID) / GRID;
      const v1 = 1 - Math.floor(cell / GRID) / GRID;
      const u1 = u0 + 1 / GRID;
      const v0 = v1 - 1 / GRID;
      const corners = [
        [-h, -h, u0, v0],
        [h, -h, u1, v0],
        [h, h, u1, v1],
        [-h, h, u0, v1],
      ];
      // Faces +z (read from behind the row, where +x is the reader's right),
      // counter-clockwise as seen from there.
      corners.forEach(([dx, dy, cu, cv], k) => {
        pos.set([p.x + dx, p.y + dy, p.z], (i * 4 + k) * 3);
        uv.set([cu, cv], (i * 4 + k) * 2);
      });
      const b = i * 4;
      index.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("uv", new BufferAttribute(uv, 2));
    geo.setIndex(index);
    geo.computeBoundingSphere();
    return geo;
  }, [plaques, labels, size]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  if (!plaques.length) return null;
  return (
    <mesh geometry={geometry} raycast={() => null} renderOrder={1}>
      <meshBasicMaterial map={texture} transparent alphaTest={0.05} toneMapped={false} />
    </mesh>
  );
}
