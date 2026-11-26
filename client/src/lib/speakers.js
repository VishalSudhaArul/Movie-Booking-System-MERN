// speakers.js
// A typical 7.1 cinema speaker arrangement for a hall, placed from its real
// dimensions: screen channels behind the screen, subwoofers below it, side
// surrounds from about a third of the way back, and rear surrounds on the back
// wall. This is an approximate layout representation of the usual placement
// for a hall of this shape — not the theatre's measured installation and not a
// live acoustic measurement.

import { soundSweetSpot } from "./seatInsights";

export const SPEAKER_NOTE =
  "Approximate layout: where speakers are usually placed in a hall of this size. It isn't the theatre's measured installation or a live acoustic measurement.";

export const SPEAKER_KINDS = {
  screen: { label: "Front left / right", color: "#56B4E9" },
  centre: { label: "Centre (dialogue)", color: "#F0E442" },
  sub: { label: "Subwoofers", color: "#CC79A7" },
  side: { label: "Side surrounds", color: "#009E73" },
  rear: { label: "Rear surrounds", color: "#E69F00" },
};

export function speakerLayout(hall) {
  const { screen, room } = hall;
  const halfW = room.width / 2;
  const stalls = hall.rows;
  const first = hall.rows[0];
  const last = hall.rows[hall.rows.length - 1];
  const floorAt = (z) => stalls.reduce((y, r) => (r.z <= z ? r.floorY : y), 0);
  const backZ = Math.max(room.depth, last.z + 3);
  const speakerY = screen.bottom + screen.height * 0.55;
  const list = [
    { id: "L", kind: "screen", label: "Front left", position: [-screen.width * 0.33, speakerY, -0.1] },
    { id: "C", kind: "centre", label: "Centre", position: [0, speakerY, -0.1] },
    { id: "R", kind: "screen", label: "Front right", position: [screen.width * 0.33, speakerY, -0.1] },
    { id: "SW1", kind: "sub", label: "Subwoofer", position: [-screen.width * 0.15, 0.6, -0.1] },
    { id: "SW2", kind: "sub", label: "Subwoofer", position: [screen.width * 0.15, 0.6, -0.1] },
  ];
  const sideStart = first.z + (last.z - first.z) * 0.3;
  const sideEnd = backZ - 1.5;
  const count = Math.max(2, Math.round((sideEnd - sideStart) / 3.2) + 1);
  for (let i = 0; i < count; i++) {
    const z = sideStart + ((sideEnd - sideStart) * i) / (count - 1);
    const y = Math.min(room.height - 1, floorAt(z) + 3.4);
    list.push({ id: `SL${i + 1}`, kind: "side", label: "Left surround", position: [-(halfW - 0.15), y, z] });
    list.push({ id: `SR${i + 1}`, kind: "side", label: "Right surround", position: [halfW - 0.15, y, z] });
  }
  const rearY = Math.min(room.height - 1, floorAt(backZ) + 3.4);
  [-0.35, -0.12, 0.12, 0.35].forEach((f, i) =>
    list.push({ id: `RS${i + 1}`, kind: "rear", label: "Rear surround", position: [room.width * f, rearY, backZ - 0.15] })
  );
  const sweet = soundSweetSpot(hall);
  return {
    format: "7.1 surround (typical placement)",
    speakers: list,
    sweetSpot: { ...sweet, y: floorAt(sweet.z), radius: Math.max(2.5, room.width * 0.14) },
    note: SPEAKER_NOTE,
  };
}
