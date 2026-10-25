"use client";

import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Float } from "@react-three/drei";
import * as THREE from "three";

export interface NodeData {
  id: string;
  step: string;
  name: string;
  tag: string;
  description: string;
  position: [number, number, number];
  color: string;
  wireColor: string;
  shape: "icosahedron" | "octahedron" | "dodecahedron" | "torus" | "box";
}

export const FLOW_NODES: NodeData[] = [
  {
    id: "prompt",
    step: "01",
    name: "Prompt",
    tag: "Natural Intent",
    description: "Multimodal developer prompt parsed into semantic intent & structural requirements",
    position: [-4.2, 0, 0],
    color: "#2563eb",
    wireColor: "#60a5fa",
    shape: "icosahedron",
  },
  {
    id: "prd",
    step: "02",
    name: "PRD Studio",
    tag: "Spec & Schemas",
    description: "Autonomous synthesis of RFC specifications, acceptance criteria & domain models",
    position: [-2.1, 0.7, -0.2],
    color: "#0284c7",
    wireColor: "#38bdf8",
    shape: "octahedron",
  },
  {
    id: "task",
    step: "03",
    name: "Task Engine",
    tag: "DAG Breakdown",
    description: "Atomic task graph with acyclic dependency resolution & parallel execution queues",
    position: [0, -0.3, 0.3],
    color: "#4f46e5",
    wireColor: "#818cf8",
    shape: "dodecahedron",
  },
  {
    id: "design",
    step: "04",
    name: "Design Studio",
    tag: "Tokens & UI",
    description: "Design-system token alignment, accessible component hierarchy & layout contracts",
    position: [2.1, 0.7, -0.2],
    color: "#7c3aed",
    wireColor: "#a78bfa",
    shape: "torus",
  },
  {
    id: "code",
    step: "05",
    name: "Code Emitter",
    tag: "TSX & Verification",
    description: "Production Next.js 16 + TypeScript code emission verified against AST rules",
    position: [4.2, 0, 0],
    color: "#059669",
    wireColor: "#34d399",
    shape: "box",
  },
];

// Single 3D wireframe node
function FlowNode({
  node,
  isSelected,
  onSelect,
}: {
  node: NodeData;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.4;
      meshRef.current.rotation.y += delta * 0.6;
    }
    if (haloRef.current) {
      haloRef.current.rotation.z -= delta * 0.3;
      const scale = isSelected
        ? 1.25 + Math.sin(state.clock.elapsedTime * 4) * 0.05
        : hovered
        ? 1.15
        : 1.0;
      haloRef.current.scale.set(scale, scale, scale);
    }
  });

  const renderGeometry = () => {
    switch (node.shape) {
      case "icosahedron":
        return <icosahedronGeometry args={[0.7, 0]} />;
      case "octahedron":
        return <octahedronGeometry args={[0.75, 0]} />;
      case "dodecahedron":
        return <dodecahedronGeometry args={[0.7, 0]} />;
      case "torus":
        return <torusGeometry args={[0.55, 0.22, 8, 16]} />;
      case "box":
        return <boxGeometry args={[0.95, 0.95, 0.95]} />;
      default:
        return <sphereGeometry args={[0.7, 16, 16]} />;
    }
  };

  return (
    <group position={node.position}>
      {/* Outer rotating wireframe cage */}
      <group
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
      >
        <mesh>
          {renderGeometry()}
          <meshBasicMaterial
            wireframe
            color={hovered || isSelected ? "#ffffff" : node.wireColor}
            transparent
            opacity={hovered || isSelected ? 0.95 : 0.65}
          />
        </mesh>

        {/* Inner glowing faceted core */}
        <mesh scale={0.52}>
          {renderGeometry()}
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={isSelected ? 0.8 : hovered ? 0.5 : 0.25}
            roughness={0.2}
            metalness={0.8}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>

      {/* Orbiting wireframe halo ring */}
      <mesh ref={haloRef} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[0.9, 0.96, 32]} />
        <meshBasicMaterial
          color={hovered || isSelected ? "#3b82f6" : node.wireColor}
          wireframe
          transparent
          opacity={isSelected ? 0.9 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* HTML Tag & Badge */}
      <Html
        position={[0, -1.15, 0]}
        center
        distanceFactor={9}
        zIndexRange={[100, 0]}
      >
        <div
          onClick={() => onSelect(node.id)}
          className={`cursor-pointer select-none px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-200 text-center whitespace-nowrap shadow-sm ${
            isSelected
              ? "bg-blue-600 text-white border-blue-500 ring-2 ring-blue-300 shadow-blue-500/20 shadow-md scale-105"
              : hovered
              ? "bg-white text-blue-700 border-blue-400 shadow-md scale-102"
              : "bg-white/90 text-slate-800 border-slate-200/90 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center gap-1.5 justify-center">
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                isSelected
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {node.step}
            </span>
            <span className="text-xs font-semibold">{node.name}</span>
          </div>
          <div
            className={`text-[10px] mt-0.5 tracking-tight ${
              isSelected ? "text-blue-100" : "text-slate-500"
            }`}
          >
            {node.tag}
          </div>
        </div>
      </Html>
    </group>
  );
}

// Flowing pulses moving along the nodes
function FlowBeams({ nodes }: { nodes: NodeData[] }) {
  const curvePoints = useMemo(() => {
    return nodes.map((n) => new THREE.Vector3(...n.position));
  }, [nodes]);

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", 0.2);
  }, [curvePoints]);

  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 0.02, 6, false);
  }, [curve]);

  const packetRef = useRef<THREE.Mesh>(null);
  const packet2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t1 = (state.clock.elapsedTime * 0.22) % 1;
    const t2 = (state.clock.elapsedTime * 0.22 + 0.5) % 1;

    if (packetRef.current) {
      const pos1 = curve.getPoint(t1);
      packetRef.current.position.copy(pos1);
    }
    if (packet2Ref.current) {
      const pos2 = curve.getPoint(t2);
      packet2Ref.current.position.copy(pos2);
    }
  });

  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          wireframe
          color="#94a3b8"
          transparent
          opacity={0.35}
        />
      </mesh>

      <mesh ref={packetRef}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <mesh ref={packet2Ref}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>
    </group>
  );
}

// Deterministic particles generated outside render to satisfy React 19 compiler
function createDeterministicPositions(count: number): Float32Array {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v1 = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const v2 = ((Math.cos(i * 4.1414) * 23421.631) % 1 + 1) % 1;
    const v3 = ((Math.sin(i * 9.8765) * 65432.123) % 1 + 1) % 1;
    arr[i * 3] = (v1 - 0.5) * 16;
    arr[i * 3 + 1] = (v2 - 0.5) * 8;
    arr[i * 3 + 2] = (v3 - 0.5) * 8 - 2;
  }
  return arr;
}

const STATIC_PARTICLE_POSITIONS = createDeterministicPositions(75);

// Particle field in background
function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.03;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[STATIC_PARTICLE_POSITIONS, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#93c5fd"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

// Wireframe ground grid for tech aesthetic
function GridFloor() {
  return (
    <group position={[0, -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <gridHelper
        args={[16, 24, "#cbd5e1", "#e2e8f0"]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

export interface Flow3DSceneProps {
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  autoRotate?: boolean;
}

export default function Flow3DScene({
  selectedNodeId,
  onSelectNode,
  autoRotate = true,
}: Flow3DSceneProps) {
  return (
    <div className="relative w-full h-[420px] md:h-[480px] lg:h-[520px] rounded-3xl overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-slate-50/50 border border-slate-200/80 shadow-[0_20px_50px_rgba(37,99,235,0.06)]">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.12),transparent_70%)]" />

      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/80 text-[11px] font-medium text-slate-700 shadow-sm pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span>3D Pipeline Graph · Interactive Wireframe</span>
      </div>

      <Canvas
        camera={{ position: [0, 0.4, 7.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <directionalLight position={[-10, -5, -5]} intensity={0.4} color="#60a5fa" />

        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
          <group position={[0, 0.2, 0]}>
            <FlowBeams nodes={FLOW_NODES} />
            {FLOW_NODES.map((node) => (
              <FlowNode
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                onSelect={onSelectNode}
              />
            ))}
          </group>
        </Float>

        <ParticleField />
        <GridFloor />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
          maxPolarAngle={Math.PI / 2 + 0.1}
          minPolarAngle={Math.PI / 3}
          maxAzimuthAngle={Math.PI / 4}
          minAzimuthAngle={-Math.PI / 4}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
