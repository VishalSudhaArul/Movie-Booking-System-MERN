import React, { useEffect, useMemo } from "react";
import { useThemeColors } from "../../lib/theme";
import MovieScreen from "./MovieScreen";
import { Instances, RowLetters } from "./HallInstances";
import { AdditiveBlending, CanvasTexture, DoubleSide, PlaneGeometry, RepeatWrapping, SRGBColorSpace } from "three";

// Surfaces
const CARPET = "#1a2240";
const AISLE = "#22304f";
const RISER_EDGE = "#0f1423";
const WALL = "#182348";
const PANEL_A = "#223063";
const PANEL_B = "#2a3a76";
const CEILING = "#0e1430";
// Accent lighting (wall washes, sconces, step lights) follows the colour theme;
// see useThemeColors below.
const EXIT_GREEN = "#2fe07a";

/** Low-contrast speckled carpet, drawn in the browser (no image download). */
function useCarpetTexture() {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1a2240";
    ctx.fillRect(0, 0, size, size);
    // Deterministic speckle so every visit looks the same.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2600; i++) {
      const v = rand();
      ctx.fillStyle = v > 0.66 ? "rgba(120,140,220,0.10)" : v > 0.33 ? "rgba(8,10,25,0.35)" : "rgba(160,120,255,0.07)";
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
    }
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(10, 14);
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Plane bent into a gentle curve so the edges come towards the audience. */
function useCurvedScreen(width, height, curve) {
  return useMemo(() => {
    const geo = new PlaneGeometry(width, height, 48, 1);
    const pos = geo.attributes.position;
    const half = width / 2;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, curve * half * (x / half) ** 2);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [width, height, curve]);
}

export default function HallScene({ hall, movieTitle, moviePoster, trailer, lowPower = false, shadows, shadowMapSize = 1024, topView = false }) {
  const { room, screen, geometry: g } = hall;
  const theme = useThemeColors(["brand-300", "brand-500", "accent-400"]);
  const STEP_LIGHT = theme["brand-300"];
  const COVE = theme["brand-500"];
  const COVE_VIOLET = theme["accent-400"];
  const halfW = room.width / 2;
  const rows = hall.rows;
  const stalls = rows.filter((r) => r.tier !== "balcony");
  const balcony = rows.filter((r) => r.tier === "balcony");
  const pitchOf = (r) => g.rowPitch[r.seatType] || g.rowPitch.standard;

  const lastStall = stalls[stalls.length - 1];
  const stallsEndZ = lastStall ? lastStall.z + pitchOf(lastStall) / 2 + 0.6 : 10;
  const balconyFrontZ = balcony.length ? balcony[0].z - pitchOf(balcony[0]) / 2 - 0.4 : stallsEndZ;
  const backZ = Math.max(room.depth, (rows[rows.length - 1]?.z || 0) + 3);
  const screenCenterY = screen.bottom + screen.height / 2;

  const screenGeo = useCurvedScreen(screen.width, screen.height, screen.curve || 0);
  useEffect(() => () => screenGeo.dispose(), [screenGeo]);
  const maxFloor = rows.reduce((m, r) => Math.max(m, r.floorY), 0);
  // Floor height at a depth (the raked floor under the seats; 0 in front of them).
  const floorAt = (z) => rows.reduce((y, r) => (r.z - pitchOf(r) / 2 <= z ? r.floorY : y), 0);
  const sideAisle = g.sideAisleWidth || 0.9;

  // Everything repeated per row, as instance lists (one draw call each).
  const parts = useMemo(() => {
    const risers = [];
    const aisles = [];
    const stepLights = [];
    const nosings = [];
    const plaques = [];
    rows.forEach((r) => {
      const pitch = pitchOf(r);
      const front = r.z - pitch / 2;
      if (r.floorY > 0) risers.push({ p: [0, r.floorY / 2, r.z + 0.05], s: [room.width, r.floorY, pitch] });
      const walkways = [halfW - sideAisle / 2, -(halfW - sideAisle / 2)];
      [...r.aisleXs, ...walkways].forEach((x, k) => {
        const isWall = k >= r.aisleXs.length;
        const w = isWall ? sideAisle * 0.85 : g.aisleWidth * 0.8;
        aisles.push({ p: [x, r.floorY + 0.006, r.z + 0.05], s: [w, pitch, 1], r: [-Math.PI / 2, 0, 0] });
        [-1, 1].forEach((side) => stepLights.push({ p: [x + side * w * 0.52, r.floorY + 0.03, front + 0.06], s: [0.18, 0.03, 0.03] }));
        if (r.floorY > 0) nosings.push({ p: [x, r.floorY - 0.01, front + 0.05], s: [w, 0.025, 0.04] });
      });
      // Row letter on the aisle-side end of each block, at armrest height.
      r.aisleXs.forEach((x) => {
        [-1, 1].forEach((side) => plaques.push({ label: r.label, x: x + side * (g.aisleWidth / 2 - 0.02), y: r.floorY + 0.78, z: r.z + 0.34 }));
      });
      if (!r.aisleXs.length && r.seats.length) {
        const ends = [r.seats[0].x + r.seatWidth / 2 + 0.2, r.seats[r.seats.length - 1].x - r.seatWidth / 2 - 0.2];
        ends.forEach((x) => plaques.push({ label: r.label, x, y: r.floorY + 0.78, z: r.z + 0.34 }));
      }
    });
    return { risers, aisles, stepLights, nosings, plaques };
  }, [hall]);

  // Acoustic wall panels, alternating shades, along both side walls.
  const panels = useMemo(() => {
    const list = [];
    for (let z = 1, i = 0; z < backZ - 1; z += 1.7, i++) {
      [-1, 1].forEach((side) =>
        list.push({ p: [side * (halfW - 0.06), room.height * 0.42, z], s: [0.1, room.height * 0.62, 1.45], color: i % 2 ? PANEL_A : PANEL_B })
      );
    }
    return list;
  }, [backZ, halfW, room.height]);

  const carpet = useCarpetTexture();
  const sconces = useMemo(() => {
    const glow = [];
    const flare = [];
    let i = 0;
    for (let z = 3; z < backZ - 2; z += 4.2, i++) {
      [-1, 1].forEach((side) => {
        const color = i % 2 ? COVE_VIOLET : COVE;
        const y = floorAt(z) + 3.2;
        glow.push({ p: [side * (halfW - 0.12), y, z], s: [0.08, 0.9, 0.22], color });
        flare.push({ p: [side * (halfW - 0.18), y, z], s: [0.01, 2.4, 1], color });
      });
    }
    return { glow, flare };
  }, [backZ, halfW, hall, COVE, COVE_VIOLET]);
  const projectorY = Math.min(room.height - 1.6, Math.max(maxFloor, 4) + 3.2);

  // Door leaves, frames and exit signs, from the layout's configured doors.
  const doorParts = useMemo(() => {
    const leaves = [];
    const frames = [];
    const signs = [];
    (hall.doors || []).forEach((d) => {
      const x = Math.sign(d.x) * (halfW - 0.04);
      const y0 = d.floorY || 0;
      const ry = [0, Math.PI / 2, 0];
      leaves.push({ p: [x, y0 + 1.1, d.z], s: [1.4, 2.2, 0.06], r: ry });
      frames.push({ p: [x, y0 + 2.25, d.z], s: [1.6, 0.06, 0.08], r: ry });
      [-1, 1].forEach((k) => frames.push({ p: [x, y0 + 1.12, d.z + k * 0.78], s: [0.06, 2.25, 0.08], r: ry }));
      signs.push({ p: [Math.sign(d.x) * (halfW - 0.08), y0 + 2.6, d.z], s: [0.6, 0.22, 0.03], r: ry });
    });
    return { leaves, frames, signs };
  }, [hall, halfW]);

  const wheelchairMarks = useMemo(
    () =>
      hall.rows.flatMap((r) =>
        r.seats.filter((s) => s.wheelchair).map((s) => ({ p: [s.x, s.floorY + 0.012, s.z - 0.55], s: [s.seatWidth * 0.8, 0.5, 1], r: [-Math.PI / 2, 0, 0] }))
      ),
    [hall]
  );

  return (
    <group>
      {/* Lighting: dim house lights, light from the screen, a soft key light. */}
      <hemisphereLight args={["#c5cfee", "#161b30", 1.05]} />
      <ambientLight intensity={0.45} />
      <spotLight
        position={[0, screenCenterY + 1, 1.5]}
        target-position={[0, 1, 14]}
        angle={0.9}
        penumbra={0.9}
        intensity={70}
        distance={45}
        decay={1.6}
        color="#9cc4ff"
      />
      <spotLight
        position={[0, room.height - 0.5, (stallsEndZ + 5) / 2]}
        target-position={[0, 0, (stallsEndZ + 5) / 2]}
        angle={1.1}
        penumbra={1}
        intensity={45}
        distance={30}
        decay={1.4}
        color="#c9d6ff"
        castShadow={shadows}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.0004}
      />
      {/* Two wall-wash lights; the sconces below are glowing fixtures, not
          extra lights, which keeps shaders small and startup fast. */}
      {[-1, 1].map((side) => (
        <pointLight key={side} position={[side * (halfW - 1), 3.6, stallsEndZ * 0.6]} intensity={14} distance={18} decay={1.4} color={COVE} />
      ))}
      <Instances items={sconces.glow}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </Instances>
      <Instances items={sconces.flare}>
        <planeGeometry />
        <meshBasicMaterial transparent opacity={0.25} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </Instances>

      {/* Screen, black masking, and the stage in front of it */}
      <MovieScreen
        geometry={screenGeo}
        centerY={screenCenterY}
        screen={screen}
        title={movieTitle}
        poster={moviePoster}
        trailer={trailer}
        lowPower={lowPower}
      />
      <mesh position={[0, screenCenterY, -0.15]}>
        <boxGeometry args={[screen.width + 1.4, screen.height + 1.2, 0.1]} />
        <meshStandardMaterial color="#03040a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.3, 1.2]} receiveShadow={shadows}>
        <boxGeometry args={[room.width - 2, 0.6, 2.4]} />
        <meshStandardMaterial color="#1c2647" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.58, 2.41]}>
        <boxGeometry args={[room.width - 2, 0.03, 0.03]} />
        <meshBasicMaterial color={STEP_LIGHT} toneMapped={false} />
      </mesh>

      {/* Floor and stepped stalls */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, backZ / 2 - 1]} receiveShadow={shadows}>
        <planeGeometry args={[room.width, backZ + 2]} />
        <meshStandardMaterial map={carpet} roughness={1} />
      </mesh>
      {/* Every raised row (stalls and balcony) is one box; one draw call in all. */}
      <Instances items={parts.risers} receiveShadow={shadows}>
        <boxGeometry />
        <meshStandardMaterial color="#171e3a" roughness={1} />
      </Instances>

      {/* Aisles (between the blocks and along the walls) with step lights */}
      <Instances items={parts.aisles} receiveShadow={shadows}>
        <planeGeometry />
        <meshStandardMaterial color={AISLE} roughness={1} />
      </Instances>
      <Instances items={parts.stepLights}>
        <boxGeometry />
        <meshBasicMaterial color={STEP_LIGHT} toneMapped={false} />
      </Instances>

      {/* Row letters on the aisle ends of the seats */}
      <RowLetters plaques={parts.plaques} text={STEP_LIGHT} />

      {/* Balcony: raised tiers, the slab underneath, a lit parapet and columns */}
      {balcony.length > 0 && (
        <group>
          <mesh position={[0, balcony[0].floorY - 0.2, balconyFrontZ + 0.5]}>
            <boxGeometry args={[room.width, 0.4, 1.2]} />
            <meshStandardMaterial color={RISER_EDGE} roughness={0.8} />
          </mesh>
          <mesh position={[0, balcony[0].floorY + 0.45, balconyFrontZ]} castShadow={shadows}>
            <boxGeometry args={[room.width - 0.2, 0.9, 0.12]} />
            <meshStandardMaterial color="#10172c" roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[0, balcony[0].floorY + 0.92, balconyFrontZ]}>
            <boxGeometry args={[room.width - 0.2, 0.04, 0.16]} />
            <meshBasicMaterial color={COVE_VIOLET} toneMapped={false} />
          </mesh>
          {[-halfW * 0.55, halfW * 0.55].map((x) => (
            <mesh key={x} position={[x, balcony[0].floorY / 2, balconyFrontZ + 0.3]}>
              <cylinderGeometry args={[0.18, 0.18, balcony[0].floorY, 16]} />
              <meshStandardMaterial color="#111830" roughness={0.5} metalness={0.3} />
            </mesh>
          ))}
        </group>
      )}

      {/* Side walls with acoustic panels */}
      {[-1, 1].map((side) => (
        <group key={`wall-${side}`}>
          <mesh position={[side * halfW, room.height / 2, backZ / 2 - 1]} rotation-y={side * -Math.PI / 2}>
            <planeGeometry args={[backZ + 2, room.height]} />
            <meshStandardMaterial color={WALL} roughness={0.95} side={DoubleSide} />
          </mesh>
        </group>
      ))}

      <Instances items={panels}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.9} />
      </Instances>

      {/* Speaker panels either side of the screen */}
      {[-1, 1].map((side) => (
        <mesh key={`spk-${side}`} position={[side * (screen.width / 2 + 1.6), screenCenterY, -0.08]}>
          <boxGeometry args={[1.6, screen.height + 0.6, 0.12]} />
          <meshStandardMaterial color="#0b0f1e" roughness={0.95} />
        </mesh>
      ))}

      {/* Stair nosings: a lit edge on the front of every raised step */}
      <Instances items={parts.nosings}>
        <boxGeometry />
        <meshBasicMaterial color={STEP_LIGHT} toneMapped={false} />
      </Instances>

      {/* Doors from the layout: a dark door leaf in a lit frame, with a green
          exit sign above. Halls without configured doors draw none. */}
      <Instances items={doorParts.leaves}>
        <boxGeometry />
        <meshStandardMaterial color="#0c1122" roughness={0.6} metalness={0.2} />
      </Instances>
      <Instances items={doorParts.frames}>
        <boxGeometry />
        <meshBasicMaterial color={STEP_LIGHT} toneMapped={false} />
      </Instances>
      <Instances items={doorParts.signs}>
        <boxGeometry />
        <meshBasicMaterial color={EXIT_GREEN} toneMapped={false} />
      </Instances>

      {/* Wheelchair spaces: a blue floor marking in front of each configured seat */}
      <Instances items={wheelchairMarks}>
        <planeGeometry />
        <meshBasicMaterial color="#2f7df6" transparent opacity={0.85} toneMapped={false} />
      </Instances>

      {/* Projection booth window and a faint beam towards the screen */}
      <mesh position={[0, projectorY, backZ - 0.05]} rotation-y={Math.PI}>
        <planeGeometry args={[1.6, 0.7]} />
        <meshBasicMaterial color="#cfe0ff" toneMapped={false} />
      </mesh>
      <mesh position={[0, (projectorY + screenCenterY) / 2, backZ / 2]} rotation-x={Math.atan2(projectorY - screenCenterY, backZ) - Math.PI / 2}>
        <coneGeometry args={[screen.width * 0.36, Math.hypot(backZ, projectorY - screenCenterY), 32, 1, true]} />
        <meshBasicMaterial color="#8fb6ff" transparent opacity={0.035} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>

      {/* Acoustic clouds hanging under the ceiling */}
      <group visible={!topView}>
        {[stallsEndZ * 0.3, stallsEndZ * 0.65, stallsEndZ].map((z, i) => (
          <mesh key={`cloud-${i}`} position={[0, room.height - 0.9, z]} rotation-x={0.06}>
            <boxGeometry args={[room.width * 0.55, 0.12, 2.2]} />
            <meshStandardMaterial color="#141c38" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Back and front walls, ceiling with light coves */}
      <mesh position={[0, room.height / 2, backZ]} rotation-y={Math.PI}>
        <planeGeometry args={[room.width, room.height]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      <mesh position={[0, room.height / 2, -0.25]}>
        <planeGeometry args={[room.width, room.height]} />
        <meshStandardMaterial color="#04060d" roughness={1} />
      </mesh>
      <group visible={!topView}>
      <mesh position={[0, room.height, backZ / 2 - 1]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[room.width, backZ + 2]} />
        <meshStandardMaterial color={CEILING} roughness={1} />
      </mesh>
      {[-halfW * 0.45, 0, halfW * 0.45].map((x, i) => (
        <mesh key={x} position={[x, room.height - 0.05, backZ / 2]}>
          <boxGeometry args={[0.12, 0.05, backZ - 4]} />
          <meshBasicMaterial color={i === 1 ? COVE_VIOLET : COVE} toneMapped={false} />
        </mesh>
      ))}
      </group>
    </group>
  );
}
