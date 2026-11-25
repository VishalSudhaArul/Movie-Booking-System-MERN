import React, { useEffect, useMemo } from "react";
import { useThemeColors } from "../../lib/theme";
import MovieScreen from "./MovieScreen";
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

export default function HallScene({ hall, movieTitle, moviePoster, trailer, lowPower = false, shadows, topView = false }) {
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

  // Acoustic wall panels, alternating shades, along both side walls.
  const panels = useMemo(() => {
    const list = [];
    for (let z = 1, i = 0; z < backZ - 1; z += 1.7, i++) list.push({ z, shade: i % 2 ? PANEL_A : PANEL_B });
    return list;
  }, [backZ]);

  const carpet = useCarpetTexture();
  const sconces = useMemo(() => {
    const list = [];
    for (let z = 3; z < backZ - 2; z += 4.2) list.push(z);
    return list;
  }, [backZ]);
  const projectorY = Math.min(room.height - 1.6, (balcony[balcony.length - 1]?.floorY || 4) + 3.2);

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
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      {/* Two wall-wash lights; the sconces below are glowing fixtures, not
          extra lights, which keeps shaders small and startup fast. */}
      {[-1, 1].map((side) => (
        <pointLight key={side} position={[side * (halfW - 1), 3.6, stallsEndZ * 0.6]} intensity={14} distance={18} decay={1.4} color={COVE} />
      ))}
      {[-1, 1].map((side) =>
        sconces.map((z, i) => (
          <group key={`sconce-${side}-${i}`} position={[side * (halfW - 0.12), 3.2, z]}>
            <mesh>
              <boxGeometry args={[0.08, 0.9, 0.22]} />
              <meshBasicMaterial color={i % 2 ? COVE_VIOLET : COVE} toneMapped={false} />
            </mesh>
            <mesh position={[-side * 0.06, 0, 0]}>
              <planeGeometry args={[0.01, 2.4]} />
              <meshBasicMaterial color={i % 2 ? COVE_VIOLET : COVE} transparent opacity={0.25} blending={AdditiveBlending} depthWrite={false} />
            </mesh>
          </group>
        ))
      )}

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
      {stalls.map((r) =>
        r.floorY > 0 ? (
          <mesh key={r.label} position={[0, r.floorY / 2, r.z + 0.05]} receiveShadow={shadows}>
            <boxGeometry args={[room.width, r.floorY, pitchOf(r)]} />
            <meshStandardMaterial map={carpet} color="#c8d0ee" roughness={1} />
          </mesh>
        ) : null
      )}

      {/* Centre aisle with step lights on each row */}
      {rows.map((r) => (
        <group key={`aisle-${r.label}`}>
          <mesh position={[0, r.floorY + 0.006, r.z + 0.05]} rotation-x={-Math.PI / 2} receiveShadow={shadows}>
            <planeGeometry args={[g.aisleWidth * 0.8, pitchOf(r)]} />
            <meshStandardMaterial color={AISLE} roughness={1} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * g.aisleWidth * 0.42, r.floorY + 0.03, r.z - pitchOf(r) / 2 + 0.06]}>
              <boxGeometry args={[0.18, 0.03, 0.03]} />
              <meshBasicMaterial color={STEP_LIGHT} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Balcony: raised tiers, the slab underneath, a lit parapet and columns */}
      {balcony.length > 0 && (
        <group>
          {balcony.map((r) => (
            <mesh key={r.label} position={[0, r.floorY / 2, r.z + 0.05]} receiveShadow={shadows}>
              <boxGeometry args={[room.width, r.floorY, pitchOf(r)]} />
              <meshStandardMaterial map={carpet} color="#c8d0ee" roughness={1} />
            </mesh>
          ))}
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
          {panels.map((p) => (
            <mesh key={p.z} position={[side * (halfW - 0.06), room.height * 0.42, p.z]}>
              <boxGeometry args={[0.1, room.height * 0.62, 1.45]} />
              <meshStandardMaterial color={p.shade} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Speaker panels either side of the screen */}
      {[-1, 1].map((side) => (
        <mesh key={`spk-${side}`} position={[side * (screen.width / 2 + 1.6), screenCenterY, -0.08]}>
          <boxGeometry args={[1.6, screen.height + 0.6, 0.12]} />
          <meshStandardMaterial color="#0b0f1e" roughness={0.95} />
        </mesh>
      ))}

      {/* Aisle stair nosings: a lit edge on the front of every raised step */}
      {rows.map((r) =>
        r.floorY > 0 ? (
          <mesh key={`nose-${r.label}`} position={[0, r.floorY - 0.01, r.z - pitchOf(r) / 2 + 0.05]}>
            <boxGeometry args={[g.aisleWidth * 0.8, 0.025, 0.04]} />
            <meshBasicMaterial color={STEP_LIGHT} toneMapped={false} />
          </mesh>
        ) : null
      )}

      {/* Side aisles along both walls */}
      {[-1, 1].map((side) => (
        <mesh key={`side-aisle-${side}`} rotation-x={-Math.PI / 2} position={[side * (halfW - 0.55), 0.004, stallsEndZ / 2 + 1.5]}>
          <planeGeometry args={[0.9, stallsEndZ - 3]} />
          <meshStandardMaterial color={AISLE} roughness={1} />
        </mesh>
      ))}

      {/* Exit signs over the doors */}
      {[
        [-(halfW - 0.6), 3.1, 3.2],
        [halfW - 0.6, 3.1, 3.2],
        [-(halfW - 0.6), 3.1, stallsEndZ - 0.5],
        [halfW - 0.6, 3.1, stallsEndZ - 0.5],
      ].map((p, i) => (
        <mesh key={`exit-${i}`} position={p} rotation-y={p[0] < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[0.6, 0.22]} />
          <meshBasicMaterial color={EXIT_GREEN} toneMapped={false} side={DoubleSide} />
        </mesh>
      ))}

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
