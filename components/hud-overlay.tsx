"use client"

import { useRef, useEffect, useMemo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { Vector2 } from "three"

const vertexShader = `
  attribute float size;
  attribute float core;
  varying vec3 vColor;
  varying float vDistance;
  uniform float uSize;
  uniform vec2 uMouse;
  uniform float uMouseRadius;
  uniform float uTime;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float distanceFromCenter = length(position);

    vec4 projected = projectionMatrix * mvPosition;
    vec2 ndc = projected.xy / projected.w;
    vDistance = length(ndc - uMouse);

    float repelStrength = 0.45;
    float repelFalloff = smoothstep(uMouseRadius, 0.0, vDistance);
    vec3 repelDir = normalize(position);
    float repelDecay = 0.5 + 0.5 * sin(uTime * 1.1 + distanceFromCenter * 2.3);

    if (core < 0.5 && uMouse.x > -0.99) {
      mvPosition.xyz += repelDir * repelFalloff * repelStrength * repelDecay;
    }

    gl_PointSize = size * uSize * (300.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);

    vColor = mix(vec3(1.0), vec3(1.3, 0.8, 0.2), core);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  varying float vDistance;
  uniform float uMouseRadius;
  uniform float uTime;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float glow = pow(1.0 - dist * 2.0, 4.0);
    glow = clamp(glow, 0.0, 1.0);

    float hoverBoost = smoothstep(uMouseRadius, 0.0, vDistance);
    float alpha = glow * (0.6 + 0.4 * hoverBoost);
    alpha *= 0.95;

    vec3 color = vColor * (0.7 + glow * 2.0 + hoverBoost * 1.2);

    gl_FragColor = vec4(color, alpha);
    if (gl_FragColor.a < 0.02) discard;
  }
`

function generateSphereGeometry(count = 22000, radius = 1.5, innerDensityFactor = 0.15, innerCount = 8000) {
  const positions = new Float32Array((count + innerCount) * 3);
  const sizes = new Float32Array(count + innerCount);
  const core = new Float32Array(count + innerCount);

  for (let i = 0; i < count; i++) {
    const r = radius * (0.8 + 0.2 * Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    sizes[i] = 1.0 + Math.random() * 0.4;
    core[i] = 0.0;
  }

  for (let i = 0; i < innerCount; i++) {
    const r = radius * innerDensityFactor * Math.pow(Math.random(), 0.8);
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const offset = (count + i) * 3;
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
    sizes[count + i] = 0.8 + Math.random() * 0.3;
    core[count + i] = 1.0;
  }

  return { positions, sizes, core, count: count + innerCount };
}

const cachedGeometry = generateSphereGeometry();

function DotSphere({ autoRotate = false, particleSize = 0.12, mouse, groupRef }) {
  const mesh = useRef()
  const shaderRef = useRef()
  const parallaxTarget = useRef(new THREE.Vector3())

  const { positions, sizes, core, count } = cachedGeometry

  useFrame((state) => {
    if (!mesh.current || !shaderRef.current) return
    shaderRef.current.uniforms.uSize.value = particleSize
    shaderRef.current.uniforms.uMouse.value = mouse.current
    shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime()

    if (autoRotate) {
      mesh.current.rotation.y += 0.0015
      mesh.current.rotation.x += 0.0008
    }

    if (groupRef.current) {
      parallaxTarget.current.x = mouse.current.x * 0.2
      parallaxTarget.current.y = mouse.current.y * 0.2
      parallaxTarget.current.z = Math.sin(mouse.current.x * Math.PI) * 0.15

      parallaxTarget.current.clamp(
        new THREE.Vector3(-0.4, -0.4, -0.2),
        new THREE.Vector3(0.4, 0.4, 0.2)
      )

      groupRef.current.position.lerp(parallaxTarget.current, 0.025)

      const targetRotX = mouse.current.y * 0.1
      const targetRotY = mouse.current.x * 0.1

      groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.05
      groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.05
    }
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-core" count={count} array={core} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uSize: { value: particleSize },
          uMouse: { value: new Vector2(-1, -1) },
          uMouseRadius: { value: 0.4 },
          uTime: { value: 0 },
        }}
      />
    </points>
  )
}

function Scene({ autoRotate, particleSize, mouse }) {
  const groupRef = useRef()

  return (
    <group ref={groupRef}>
      <color attach="background" args={["#000"]} />
      <DotSphere autoRotate={autoRotate} particleSize={particleSize} mouse={mouse} groupRef={groupRef} />
      <OrbitControls enableDamping dampingFactor={0.05} rotateSpeed={0.5} autoRotate={false} />
    </group>
  )
}

export default function ParticleSphere({ autoRotate }) {
  const mouse = useRef(new Vector2(-1, -1))
  const particleSize = 0.12

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
      dpr={[1, 2]}
    >
      <Scene autoRotate={autoRotate} particleSize={particleSize} mouse={mouse} />
    </Canvas>
  )
}
