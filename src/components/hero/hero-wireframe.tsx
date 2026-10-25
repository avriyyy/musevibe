"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COLORS = ["#1E6BFF", "#38BDF8", "#7C3AED", "#A78BFA", "#F472B6"];
const SHAPES = ["icosahedron", "octahedron", "dodecahedron", "torus", "box"] as const;

function WireGraph() {
  const group = useRef<THREE.Group>(null);
  const points = useMemo(() => {
    const pts: [number, number, number][] = [
      [-4, 0.4, 0], [-2, -0.4, 0], [0, 0.4, 0], [2, -0.4, 0], [4, 0.4, 0],
    ];
    return pts;
  }, []);
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      verts.push(...points[i], ...points[i + 1]);
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, [points]);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.08;
    // Mouse parallax halus, tanpa mengunci scroll
    const targetX = state.pointer.y * 0.12;
    const targetY = state.pointer.x * 0.18;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.05;
    group.current.rotation.z += (targetY - group.current.rotation.z) * 0.02;
  });

  return (
    <group ref={group}>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#3b82f6" transparent opacity={0.45} />
      </lineSegments>
      {points.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          {SHAPES[i] === "icosahedron" && <icosahedronGeometry args={[0.55, 0]} />}
          {SHAPES[i] === "octahedron" && <octahedronGeometry args={[0.6, 0]} />}
          {SHAPES[i] === "dodecahedron" && <dodecahedronGeometry args={[0.55, 0]} />}
          {SHAPES[i] === "torus" && <torusGeometry args={[0.45, 0.18, 8, 20]} />}
          {SHAPES[i] === "box" && <boxGeometry args={[0.8, 0.8, 0.8]} />}
          <meshBasicMaterial color={COLORS[i]} wireframe transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export default function HeroWireframe() {
  return (
    <div
      className="w-full h-64 md:h-80 rounded-xl border border-white/10 bg-[#05060A] overflow-hidden"
      aria-hidden="true"
    >
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
        <WireGraph />
      </Canvas>
    </div>
  );
}
