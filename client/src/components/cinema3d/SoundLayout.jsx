import React, { useMemo } from "react";
import { DoubleSide } from "three";
import { Instances } from "./HallInstances";
import { SPEAKER_KINDS, speakerLayout } from "../../lib/speakers";

/**
 * Speaker cabinets (one instanced draw call per kind) and the estimated sound
 * sweet spot as a soft ring on the floor. Approximate placement only: see
 * lib/speakers.js. Silent — nothing here plays audio.
 */
export default function SoundLayout({ hall }) {
  const layout = useMemo(() => speakerLayout(hall), [hall]);
  const byKind = useMemo(() => {
    const groups = {};
    layout.speakers.forEach((s) => {
      const size = s.kind === "sub" ? [0.9, 0.7, 0.5] : s.kind === "side" || s.kind === "rear" ? [0.45, 0.6, 0.35] : [1.1, 1.6, 0.4];
      // Side speakers face across the room.
      const r = s.kind === "side" ? [0, Math.sign(s.position[0]) * -Math.PI / 2, 0] : s.kind === "rear" ? [0, Math.PI, 0] : [0, 0, 0];
      (groups[s.kind] = groups[s.kind] || []).push({ p: s.position, s: size, r });
    });
    return groups;
  }, [layout]);
  const { sweetSpot } = layout;

  return (
    <group>
      {Object.entries(byKind).map(([kind, items]) => (
        <Instances key={kind} items={items}>
          <boxGeometry />
          <meshBasicMaterial color={SPEAKER_KINDS[kind].color} toneMapped={false} />
        </Instances>
      ))}
      <mesh position={[sweetSpot.x, sweetSpot.y + 1.3, sweetSpot.z]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[sweetSpot.radius * 0.55, sweetSpot.radius, 48]} />
        <meshBasicMaterial color="#F0E442" transparent opacity={0.22} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
