import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion, useReducedMotion } from "framer-motion";

function OrbCore() {
  const shellRef = useRef<any>(null);
  const ringRef = useRef<any>(null);
  const ringTwoRef = useRef<any>(null);
  const particlesRef = useRef<any>(null);

  const particlePositions = useMemo(() => {
    const positions = new Float32Array(900);
    for (let i = 0; i < positions.length; i += 3) {
      const radius = 1.55 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (shellRef.current) {
      shellRef.current.rotation.y = time * 0.28;
      shellRef.current.rotation.x = Math.sin(time * 0.35) * 0.16;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.5;
      ringRef.current.rotation.x = Math.PI / 2.9;
    }
    if (ringTwoRef.current) {
      ringTwoRef.current.rotation.y = time * -0.42;
      ringTwoRef.current.rotation.x = Math.PI / 3.3;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.08;
      particlesRef.current.rotation.x = time * -0.05;
    }
  });

  return (
    <group>
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[1.08, 4]} />
        <meshStandardMaterial color="#4f7cff" emissive="#133fbe" emissiveIntensity={0.55} roughness={0.16} metalness={0.3} wireframe />
      </mesh>

      <mesh ref={ringRef}>
        <torusGeometry args={[1.62, 0.03, 18, 120]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.36} transparent opacity={0.9} />
      </mesh>

      <mesh ref={ringTwoRef}>
        <torusGeometry args={[2.02, 0.02, 14, 120]} />
        <meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={0.3} transparent opacity={0.65} />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particlePositions.length / 3} array={particlePositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.028} color="#93c5fd" transparent opacity={0.85} sizeAttenuation />
      </points>
    </group>
  );
}

export default function AgenticOrbScene() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-[18rem] w-full overflow-hidden rounded-[1.8rem] border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.18),rgba(2,6,23,0.94)_58%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(7,11,24,0.96))] shadow-[0_50px_120px_-70px_rgba(8,15,40,0.95)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(34,211,238,0.2),transparent_26%),radial-gradient(circle_at_70%_70%,rgba(124,58,237,0.18),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:34px_34px] opacity-25" />

      <Canvas camera={{ position: [0, 0, 4.6], fov: 46 }} dpr={[1, 1.8]}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 2, 3]} intensity={1.3} color="#7dd3fc" />
        <pointLight position={[-2, -1, 2]} intensity={1.1} color="#4f46e5" />
        <Suspense fallback={null}>
          <OrbCore />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.26em] text-sky-200/70">Live orchestration</div>
          <div className="mt-2 max-w-[16rem] text-sm leading-6 text-slate-300">
            Ambient system motion for reasoning, retrieval, and output flow.
          </div>
        </div>
        <div className="hidden gap-2 md:flex">
          {["Multi-agent", "Case-aware", "Evidence-linked"].map((label, index) => (
            <motion.span
              key={label}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + index * 0.08, duration: 0.35, ease: "easeOut" }}
              className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200"
            >
              {label}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}
