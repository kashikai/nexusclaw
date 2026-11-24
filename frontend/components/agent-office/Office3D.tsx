'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { IsometricOffice } from './IsometricOffice'
import { formatClock, formatRelative, truncate } from '@/lib/agent-office/format'
import { derivePresentation, lastEventFor, type ScenePresentation } from '@/lib/agent-office/presentation'
import type { Locale, Strings } from '@/lib/agent-office/strings'
import { AGENT_IDS, type AgentId, type AgentState, type DeskId, type PublicState } from '@/lib/agent-office/types'

export interface Office3DProps {
  state: PublicState | null
  dimmed: boolean
  t: Strings
  locale: Locale
  desk: DeskId
  resetSignal?: number
  sessionKey?: string
}

type ProjectionMode = 'shell' | 'attractor' | 'singularity'

const PROJECTIONS: { id: ProjectionMode; label: string; sub: string }[] = [
  { id: 'shell', label: 'NEURAL SHELL', sub: 'LATENT-STATE PROJECTION' },
  { id: 'attractor', label: 'ATTRACTOR', sub: '15D PHASE MANIFOLD' },
  { id: 'singularity', label: 'SINGULARITY', sub: 'LIQUIDITY ACCRETION FIELD' },
]

const CHANNEL_ACCENT: Record<AgentId, { hex: string; dim: string; code: string; side: 'left' | 'right'; y: number }> = {
  scanner: { hex: '#10b981', dim: '#134e4a', code: '01', side: 'left', y: 1.05 },
  analyst: { hex: '#22d3ee', dim: '#164e63', code: '02', side: 'left', y: -1.05 },
  executor: { hex: '#f5c542', dim: '#713f12', code: '03', side: 'right', y: 1.05 },
  reporter: { hex: '#fb923c', dim: '#7c2d12', code: '04', side: 'right', y: -1.05 },
}

const ERROR_HEX = '#ef4444'
const IDLE_HEX = '#334155'

const DEFAULT_CAM_POS = new THREE.Vector3(0, 0.55, 7.6)
const DEFAULT_CAM_TARGET = new THREE.Vector3(0, 0, 0)

const PARTICLE_COUNT = 15_000
const STRANDS_PER_AGENT = 8
const CURVE_SAMPLES = 44
const PULSES_PER_AGENT = 24

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generates three harmonized 3D point-cloud targets for every particle:
 *  1) NEURAL SHELL (Novakine): luminous spherical shell + crisp latitude/longitude rings + warm core
 *  2) ATTRACTOR (Vantix): luminous golden central helical vortex ribbon inside a cyan spherical cloud
 *  3) SINGULARITY (Heliovex): logarithmic accretion vortex disc with concentric orbital rings
 */
function buildParticleCloudBuffers() {
  const rand = mulberry32(20261124)

  const posShell = new Float32Array(PARTICLE_COUNT * 3)
  const posAttractor = new Float32Array(PARTICLE_COUNT * 3)
  const posSingularity = new Float32Array(PARTICLE_COUNT * 3)
  const colShell = new Float32Array(PARTICLE_COUNT * 3)
  const colAttractor = new Float32Array(PARTICLE_COUNT * 3)
  const colSingularity = new Float32Array(PARTICLE_COUNT * 3)
  const aSize = new Float32Array(PARTICLE_COUNT)
  const aSeed = new Float32Array(PARTICLE_COUNT)

  const cEmerald = new THREE.Color('#10b981')
  const cCyan = new THREE.Color('#22d3ee')
  const cGold = new THREE.Color('#f5c542')
  const cAmber = new THREE.Color('#f97316')
  const cCoral = new THREE.Color('#ef4444')
  const cIce = new THREE.Color('#bae6fd')
  const tmp = new THREE.Color()

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const u = i / PARTICLE_COUNT
    const i3 = i * 3
    aSeed[i] = rand()

    // ── 1) NEURAL SHELL (Novakine-style spherical heat-spectrum point cloud) ──
    if (i < PARTICLE_COUNT * 0.68) {
      // Structured Fibonacci-perturbed spherical shell with faint meridian/parallel emphasis
      const idx = i / (PARTICLE_COUNT * 0.68)
      const goldenAngle = Math.PI * (3 - Math.sqrt(5))
      const yBase = 1 - idx * 2
      const radAtY = Math.sqrt(Math.max(0, 1 - yBase * yBase))
      const theta = goldenAngle * i + (rand() - 0.5) * 0.14
      const radius = 2.08 + (rand() - 0.5) * 0.14
      const sx = Math.cos(theta) * radAtY * radius
      const sy = yBase * radius
      const sz = Math.sin(theta) * radAtY * radius
      posShell[i3] = sx
      posShell[i3 + 1] = sy
      posShell[i3 + 2] = sz

      // Novakine thermal-spectral gradient: emerald upper/core -> gold mid -> warm coral lower rim
      const rim = Math.min(1, Math.hypot(sx, sy) / 2.2)
      const heat = 0.5 - yBase * 0.35 + rim * 0.35 + (rand() - 0.5) * 0.12
      if (heat < 0.38) tmp.copy(cEmerald).lerp(cCyan, rand() * 0.35)
      else if (heat < 0.68) tmp.copy(cEmerald).lerp(cGold, (heat - 0.38) / 0.3)
      else if (heat < 0.88) tmp.copy(cGold).lerp(cAmber, (heat - 0.68) / 0.2)
      else tmp.copy(cAmber).lerp(cCoral, Math.min(1, (heat - 0.88) / 0.18))

      colShell[i3] = tmp.r
      colShell[i3 + 1] = tmp.g
      colShell[i3 + 2] = tmp.b
      aSize[i] = 1.0 + rand() * 1.15
    } else if (i < PARTICLE_COUNT * 0.9) {
      // Inner luminous golden-emerald nebula core
      const r = Math.pow(rand(), 1.45) * 1.45
      const phi = Math.acos(2 * rand() - 1)
      const theta = rand() * Math.PI * 2
      posShell[i3] = r * Math.sin(phi) * Math.cos(theta)
      posShell[i3 + 1] = r * Math.cos(phi)
      posShell[i3 + 2] = r * Math.sin(phi) * Math.sin(theta)

      tmp.copy(cGold).lerp(cEmerald, Math.min(1, r / 1.4))
      colShell[i3] = tmp.r
      colShell[i3 + 1] = tmp.g
      colShell[i3 + 2] = tmp.b
      aSize[i] = 0.9 + rand() * 1.4
    } else {
      // Crisp latitude/longitude geodesic accent rings on the sphere
      const ringIdx = i % 6
      const angle = rand() * Math.PI * 2
      const R = 2.16
      let rx = Math.cos(angle) * R
      let ry = Math.sin(angle) * R
      let rz = 0
      if (ringIdx === 1) { [rx, ry, rz] = [Math.cos(angle) * R, 0, Math.sin(angle) * R] }
      else if (ringIdx === 2) { [rx, ry, rz] = [0, Math.cos(angle) * R, Math.sin(angle) * R] }
      else if (ringIdx === 3) {
        const tilt = 0.72
        rx = Math.cos(angle) * R
        ry = Math.sin(angle) * R * Math.cos(tilt)
        rz = Math.sin(angle) * R * Math.sin(tilt)
      } else if (ringIdx === 4) {
        const tilt = -0.78
        rx = Math.cos(angle) * R * Math.cos(tilt)
        ry = Math.sin(angle) * R
        rz = Math.cos(angle) * R * Math.sin(tilt)
      } else if (ringIdx === 5) {
        const lat = (rand() - 0.5) * 1.6
        const rr = Math.sqrt(Math.max(0.05, R * R - lat * lat))
        rx = Math.cos(angle) * rr
        ry = lat
        rz = Math.sin(angle) * rr
      }
      posShell[i3] = rx
      posShell[i3 + 1] = ry
      posShell[i3 + 2] = rz

      tmp.copy(cGold).lerp(cIce, 0.35)
      colShell[i3] = tmp.r
      colShell[i3 + 1] = tmp.g
      colShell[i3 + 2] = tmp.b
      aSize[i] = 1.2 + rand() * 0.9
    }

    // ── 2) ATTRACTOR (Vantix-style golden vertical twisted ribbon inside cyan manifold) ──
    if (i < PARTICLE_COUNT * 0.56) {
      // Twisted strange-attractor central vertical core + top/bottom toroidal flares
      const t = (rand() - 0.5) * 2 // -1..1
      const y = t * 1.85
      const flare = 0.28 + Math.pow(Math.abs(t), 2.4) * 1.55
      const twist = t * 5.2 + rand() * Math.PI * 2
      const thickness = (rand() - 0.5) * 0.38
      const r = flare + thickness
      posAttractor[i3] = Math.cos(twist) * r * (0.55 + 0.45 * Math.abs(t))
      posAttractor[i3 + 1] = y + Math.sin(twist * 2.0) * 0.12
      posAttractor[i3 + 2] = Math.sin(twist) * r * (0.55 + 0.45 * Math.abs(t))

      const coreHeat = 1 - Math.min(1, Math.abs(t) * 1.05)
      tmp.copy(cCyan).lerp(cGold, Math.pow(coreHeat, 0.75))
      if (coreHeat > 0.7) tmp.lerp(cIce, 0.35)
      colAttractor[i3] = tmp.r
      colAttractor[i3 + 1] = tmp.g
      colAttractor[i3 + 2] = tmp.b
    } else {
      // Translucent outer cyan/ice spherical manifold + scattered latent nodes
      const r = 2.02 + (rand() - 0.5) * 0.48
      const phi = Math.acos(2 * rand() - 1)
      const theta = rand() * Math.PI * 2
      posAttractor[i3] = r * Math.sin(phi) * Math.cos(theta)
      posAttractor[i3 + 1] = r * Math.cos(phi)
      posAttractor[i3 + 2] = r * Math.sin(phi) * Math.sin(theta)

      tmp.copy(cCyan).lerp(cIce, rand() * 0.45).multiplyScalar(0.75)
      colAttractor[i3] = tmp.r
      colAttractor[i3 + 1] = tmp.g
      colAttractor[i3 + 2] = tmp.b
    }

    // ── 3) SINGULARITY (Heliovex-style logarithmic accretion-disk vortex) ──
    if (i < PARTICLE_COUNT * 0.82) {
      const arm = i % 5
      const r = 0.14 + Math.pow(rand(), 1.35) * 2.55
      const spiralAngle = arm * ((Math.PI * 2) / 5) + Math.log(r + 0.12) * 3.6 + (rand() - 0.5) * (0.35 + r * 0.16)
      const tilt = 0.55
      const x0 = Math.cos(spiralAngle) * r
      const z0 = Math.sin(spiralAngle) * r
      const y0 = (rand() - 0.5) * (0.08 + r * 0.08)

      posSingularity[i3] = x0
      posSingularity[i3 + 1] = y0 * Math.cos(tilt) - z0 * Math.sin(tilt)
      posSingularity[i3 + 2] = y0 * Math.sin(tilt) + z0 * Math.cos(tilt)

      const centerGlow = Math.max(0, 1 - r / 2.6)
      tmp.copy(cEmerald).lerp(cCyan, 0.55)
      if (centerGlow > 0.55) tmp.lerp(cIce, (centerGlow - 0.55) / 0.45)
      else if (rand() < 0.1) tmp.copy(cGold)
      colSingularity[i3] = tmp.r
      colSingularity[i3 + 1] = tmp.g
      colSingularity[i3 + 2] = tmp.b
    } else {
      // Segmented outer radar calibration ring around the singularity
      const seg = Math.floor(u * 120)
      const a = (seg / 120) * Math.PI * 2 + (rand() - 0.5) * 0.015
      const R = rand() > 0.45 ? 2.42 : 2.12
      const tilt = 0.55
      const x0 = Math.cos(a) * R
      const z0 = Math.sin(a) * R
      posSingularity[i3] = x0
      posSingularity[i3 + 1] = -z0 * Math.sin(tilt)
      posSingularity[i3 + 2] = z0 * Math.cos(tilt)

      tmp.copy(rand() > 0.18 ? cCyan : cGold)
      colSingularity[i3] = tmp.r
      colSingularity[i3 + 1] = tmp.g
      colSingularity[i3 + 2] = tmp.b
    }
  }

  return {
    posShell,
    posAttractor,
    posSingularity,
    colShell,
    colAttractor,
    colSingularity,
    aSize,
    aSeed,
  }
}

const PARTICLE_VERT = /* glsl */ `
  attribute vec3 aPosAttractor;
  attribute vec3 aPosSingularity;
  attribute vec3 aColShell;
  attribute vec3 aColAttractor;
  attribute vec3 aColSingularity;
  attribute float aSize;
  attribute float aSeed;

  uniform float uTime;
  uniform float uWAttractor;
  uniform float uWSingularity;
  uniform float uActivity;
  uniform float uDimmed;
  uniform float uError;
  uniform float uLocked;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float wShell = max(0.0, 1.0 - uWAttractor - uWSingularity);
    vec3 p = position * wShell + aPosAttractor * uWAttractor + aPosSingularity * uWSingularity;
    vec3 col = aColShell * wShell + aColAttractor * uWAttractor + aColSingularity * uWSingularity;

    // Gentle fluid phase swirl proportional to real agent activity (zero synthetic jitter when idle/dimmed)
    float speed = mix(0.08, 0.55, uActivity) * (1.0 - uDimmed * 0.75);
    float r = length(p.xz);
    float swirl = uTime * speed * (0.35 + 0.65 / (0.6 + r));
    float cs = cos(swirl * 0.22);
    float sn = sin(swirl * 0.22);
    p.xz = mat2(cs, -sn, sn, cs) * p.xz;

    // Subtle radial breathing only when active or position-locked
    float breath = 1.0 + sin(uTime * 2.1 + aSeed * 6.2831 + length(p) * 1.8) * (0.018 * uActivity + 0.02 * uLocked);
    p *= breath;

    // Tint toward cool slate when offline/dimmed, or crisp crimson edge pulse on error
    vec3 slate = vec3(0.24, 0.34, 0.42);
    col = mix(col, slate, uDimmed * 0.78);
    if (uError > 0.01) {
      float errWave = 0.5 + 0.5 * sin(uTime * 5.0 + aSeed * 12.0);
      col = mix(col, vec3(1.0, 0.28, 0.28), uError * (0.35 + 0.35 * errWave));
    }
    if (uLocked > 0.5 && uDimmed < 0.5) {
      col = mix(col, vec3(0.2, 0.92, 0.96), 0.16);
    }

    vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
    float dist = max(1.5, -mvPos.z);
    float twinkle = 0.75 + 0.25 * sin(uTime * (1.5 + uActivity * 2.5) + aSeed * 41.0);
    gl_PointSize = clamp((aSize * (13.5 + uActivity * 3.5) * uPixelRatio) / dist, 1.2, 7.5);
    gl_Position = projectionMatrix * mvPos;

    vColor = col * (0.78 + 0.42 * uActivity) * twinkle;
    vAlpha = mix(0.42, 0.92, uActivity) * (1.0 - uDimmed * 0.45);
  }
`

const PARTICLE_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d2 = dot(uv, uv);
    if (d2 > 0.25) discard;
    // Crisp hot pinpoint center with silky Gaussian aura
    float core = exp(-d2 * 28.0);
    float halo = exp(-d2 * 7.5) * 0.45;
    float alpha = (core + halo) * vAlpha;
    vec3 finalCol = vColor + vec3(core * 0.35);
    gl_FragColor = vec4(finalCol, alpha);
  }
`

interface FiberChannel {
  id: AgentId
  curves: THREE.CubicBezierCurve3[]
  lineMats: THREE.LineBasicMaterial[]
  pulsePositions: Float32Array
  pulseGeom: THREE.BufferGeometry
  pulseMat: THREE.PointsMaterial
  pulsePoints: THREE.Points
}

function buildFiberChannel(id: AgentId): { group: THREE.Group; channel: FiberChannel } {
  const cfg = CHANNEL_ACCENT[id]
  const sign = cfg.side === 'left' ? -1 : 1
  const rand = mulberry32(id.charCodeAt(0) * 997 + id.charCodeAt(1) * 31)

  const group = new THREE.Group()
  const curves: THREE.CubicBezierCurve3[] = []
  const lineMats: THREE.LineBasicMaterial[] = []

  for (let s = 0; s < STRANDS_PER_AGENT; s++) {
    const spread = (s / (STRANDS_PER_AGENT - 1) - 0.5) * 0.52
    const p0 = new THREE.Vector3(sign * 4.55, cfg.y + spread * 0.65, (rand() - 0.5) * 0.45)
    const p1 = new THREE.Vector3(sign * 3.05, cfg.y * 0.92 + spread * 1.15, (rand() - 0.5) * 0.9)
    const p2 = new THREE.Vector3(sign * 1.95, cfg.y * 0.35 + spread * 0.85, (rand() - 0.5) * 0.85)
    // Land smoothly inside the neural shell hemisphere
    const endAngle = (rand() - 0.5) * 1.15
    const endY = cfg.y * 0.42 + (rand() - 0.5) * 0.75
    const endR = 1.65 + rand() * 0.45
    const p3 = new THREE.Vector3(sign * Math.cos(endAngle) * endR, endY, Math.sin(endAngle) * endR)

    const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3)
    curves.push(curve)

    const pts = curve.getPoints(CURVE_SAMPLES)
    const geom = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(cfg.hex),
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    lineMats.push(mat)
    group.add(new THREE.Line(geom, mat))
  }

  const pulsePositions = new Float32Array(PULSES_PER_AGENT * 3)
  const pulseGeom = new THREE.BufferGeometry()
  pulseGeom.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3))
  const pulseMat = new THREE.PointsMaterial({
    color: new THREE.Color(cfg.hex),
    size: 0.085,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const pulsePoints = new THREE.Points(pulseGeom, pulseMat)
  pulsePoints.visible = false
  group.add(pulsePoints)

  return {
    group,
    channel: { id, curves, lineMats, pulsePositions, pulseGeom, pulseMat, pulsePoints },
  }
}

/** Crisp SVG micro-waveform bars that stay calm when idle and animate smoothly when working. */
function MicroWave({ active, error, color }: { active: boolean; error: boolean; color: string }) {
  const heights = active ? [5, 11, 7, 14, 9, 13, 6, 12, 8, 10] : [3, 4, 3, 5, 3, 4, 3, 4, 3, 3]
  const fill = error ? ERROR_HEX : active ? color : '#334155'
  return (
    <svg width="48" height="16" viewBox="0 0 48 16" aria-hidden="true" className="shrink-0">
      {heights.map((h, idx) => (
        <rect
          key={idx}
          x={idx * 5}
          y={16 - h}
          width="3"
          height={h}
          rx="0.5"
          fill={fill}
          opacity={active || error ? 0.9 : 0.45}
        />
      ))}
    </svg>
  )
}

function AgentTelemetryCard({
  agent,
  role,
  statusText,
  selected,
  dimmed,
  now,
  locale,
  onSelect,
}: {
  agent: AgentState
  role: string
  statusText: string
  selected: boolean
  dimmed: boolean
  now: number
  locale: Locale
  onSelect: () => void
}) {
  const cfg = CHANNEL_ACCENT[agent.id]
  const effectiveStatus = dimmed ? 'idle' : agent.status
  const working = effectiveStatus === 'working'
  const isError = effectiveStatus === 'error'
  const accent = isError ? ERROR_HEX : working ? cfg.hex : IDLE_HEX
  const alignRight = cfg.side === 'right'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group pointer-events-auto w-full text-left border px-3 py-2.5 transition-all backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542] ${
        selected
          ? 'bg-[#08131a]/95 border-[#f5c542]/80 shadow-[0_0_20px_rgba(245,197,66,0.12)]'
          : isError
            ? 'bg-[#1a0709]/90 border-red-500/70'
            : working
              ? 'bg-[#050c12]/88 border-[#1b3540] hover:border-[#2e5868]'
              : 'bg-[#04080c]/78 border-[#122129] hover:border-[#1e3540]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-1.5 h-1.5 shrink-0 ${working || isError ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
          <span className="font-mono text-[9px] text-gray-500">{cfg.code}</span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-gray-100 truncate">
            {agent.id}
          </span>
        </div>
        <span
          className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border shrink-0"
          style={{
            color: working || isError ? accent : '#64748b',
            borderColor: working || isError ? `${accent}55` : '#1e293b',
            backgroundColor: working || isError ? `${accent}14` : 'transparent',
          }}
        >
          {statusText}
        </span>
      </div>

      <p className="font-mono text-[10px] leading-snug text-gray-300 truncate">
        {effectiveStatus === 'idle' ? role : agent.label || statusText}
      </p>

      <div className={`mt-2 flex items-center justify-between gap-2 ${alignRight ? 'flex-row-reverse' : ''}`}>
        <MicroWave active={working} error={isError} color={cfg.hex} />
        <span className="font-mono text-[9px] text-gray-500 tabular-nums">
          {formatRelative(agent.last_event_at, now, locale)}
        </span>
      </div>
    </button>
  )
}

/**
 * NEXUSCLAW // NEURAL SHELL v4 — Scientific Point-Cloud & Luminous Fiber Terminal.
 * Inspired by quantitative latent-state shells, phase-space attractors, and liquidity vortices.
 * 100% driven by validated PublicState (via presentation.ts) with strict open-trade privacy.
 */
export function Office3D({ state, dimmed, t, locale, desk, resetSignal = 0, sessionKey }: Office3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [webglFailed, setWebglFailed] = useState(false)
  const [mode, setMode] = useState<ProjectionMode>('shell')
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const presentation: ScenePresentation = useMemo(() => derivePresentation(state, dimmed), [state, dimmed])
  const agents: AgentState[] = useMemo(
    () => state?.agents ?? AGENT_IDS.map(id => ({ id, status: 'idle', label: '', last_event_at: null })),
    [state],
  )
  const byId = useMemo(() => new Map(agents.map(a => [a.id, a])), [agents])
  const roles = desk === 'quantbot' ? t.quantRoles : t.roles
  const latestEvent = state?.recent_events?.[0] ?? null
  const selectedEvent = selectedAgent ? lastEventFor(state, selectedAgent) : null

  const summary = useMemo(
    () => agents.map(a => `${t.agents[a.id]}: ${t.status[dimmed ? 'idle' : a.status]}${a.label ? ` (${a.label})` : ''}`).join('; '),
    [agents, dimmed, t],
  )

  useEffect(() => {
    setSelectedAgent(null)
  }, [desk, sessionKey])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const refs = useRef<{
    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    uniforms: {
      uTime: { value: number }
      uWAttractor: { value: number }
      uWSingularity: { value: number }
      uActivity: { value: number }
      uDimmed: { value: number }
      uError: { value: number }
      uLocked: { value: number }
      uPixelRatio: { value: number }
    }
    channels: Record<AgentId, FiberChannel>
    cageMat: THREE.LineBasicMaterial
    ringMats: THREE.LineBasicMaterial[]
    lockRing: THREE.LineLoop
    lockRingMat: THREE.LineBasicMaterial
    targetWeights: { attractor: number; singularity: number }
    targetCam: { pos: THREE.Vector3; target: THREE.Vector3 } | null
    liveState: {
      presentation: ScenePresentation
      selected: AgentId | null
      reducedMotion: boolean
    }
    renderOnce: () => void
  } | null>(null)

  // Reset camera when parent toolbar clicks "Reset camera"
  useEffect(() => {
    if (!resetSignal || !refs.current) return
    setSelectedAgent(null)
    refs.current.targetCam = { pos: DEFAULT_CAM_POS.clone(), target: DEFAULT_CAM_TARGET.clone() }
    refs.current.renderOnce()
  }, [resetSignal])

  // Update projection target weights when switching Neural Shell / Attractor / Singularity
  useEffect(() => {
    if (!refs.current) return
    refs.current.targetWeights.attractor = mode === 'attractor' ? 1 : 0
    refs.current.targetWeights.singularity = mode === 'singularity' ? 1 : 0
    if (refs.current.liveState.reducedMotion) {
      refs.current.uniforms.uWAttractor.value = refs.current.targetWeights.attractor
      refs.current.uniforms.uWSingularity.value = refs.current.targetWeights.singularity
      refs.current.renderOnce()
    }
  }, [mode])

  // Sync validated presentation & selection into GPU uniforms and fiber channels
  const syncVisuals = useCallback(() => {
    const r = refs.current
    if (!r) return

    r.liveState.presentation = presentation
    r.liveState.selected = selectedAgent

    const activity = presentation.dimmed ? 0 : Math.min(1, presentation.workingCount / 3)
    r.uniforms.uActivity.value = activity
    r.uniforms.uDimmed.value = presentation.dimmed ? 1 : 0
    r.uniforms.uError.value = presentation.hasError && !presentation.dimmed ? 1 : 0
    r.uniforms.uLocked.value = presentation.openPositions > 0 && !presentation.dimmed ? 1 : 0

    // Bounding wireframe cube & measurement rings
    r.cageMat.color.set(presentation.hasError ? '#7f1d1d' : presentation.dimmed ? '#1e293b' : '#1f3b44')
    r.cageMat.opacity = presentation.dimmed ? 0.25 : 0.48
    r.ringMats.forEach((m, idx) => {
      m.color.set(
        presentation.hasError
          ? ERROR_HEX
          : presentation.live && idx === 0
            ? '#f5c542'
            : idx === 0
              ? '#22d3ee'
              : '#10b981',
      )
      m.opacity = presentation.dimmed ? 0.1 : 0.26 + activity * 0.28
    })

    r.lockRing.visible = presentation.openPositions > 0 && !presentation.dimmed
    r.lockRingMat.color.set(presentation.live ? '#f5c542' : '#22d3ee')

    for (const id of AGENT_IDS) {
      const ch = r.channels[id]
      const ap = presentation.agents[id]
      const cfg = CHANNEL_ACCENT[id]
      const isFocused = selectedAgent === id
      const isDimmedBySelection = selectedAgent !== null && !isFocused

      const col = ap.error ? ERROR_HEX : ap.working ? cfg.hex : IDLE_HEX
      const baseOpacity = presentation.dimmed
        ? 0.06
        : ap.error
          ? 0.65
          : ap.working
            ? 0.44
            : 0.12
      const finalOpacity = isFocused ? Math.min(0.85, baseOpacity + 0.35) : isDimmedBySelection ? baseOpacity * 0.35 : baseOpacity

      ch.lineMats.forEach((mat, idx) => {
        mat.color.set(col)
        // Slight central strand emphasis
        const weight = 0.65 + 0.35 * (1 - Math.abs(idx / (STRANDS_PER_AGENT - 1) - 0.5) * 2)
        mat.opacity = finalOpacity * weight
      })

      ch.pulseMat.color.set(ap.error ? ERROR_HEX : cfg.hex)
      ch.pulsePoints.visible = !presentation.dimmed && (ap.working || ap.error)
    }

    // Smooth camera focus when an agent card is clicked
    if (selectedAgent) {
      const cfg = CHANNEL_ACCENT[selectedAgent]
      const sign = cfg.side === 'left' ? -1 : 1
      r.targetCam = {
        pos: new THREE.Vector3(sign * 1.85, cfg.y * 0.55 + 0.35, 6.75),
        target: new THREE.Vector3(sign * 0.45, cfg.y * 0.18, 0),
      }
    } else {
      r.targetCam = null
    }

    r.renderOnce()
  }, [presentation, selectedAgent])

  // Initialize Three.js WebGL scene once
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      setWebglFailed(true)
      return
    }

    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let reducedMotion = mq?.matches ?? false

    const width = container.clientWidth || 820
    const height = Math.max(460, Math.round(width * 0.6))

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height)
    renderer.setClearColor(0x030608, 1)
    container.innerHTML = ''
    container.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = 'auto'

    let disposed = false
    let rafId = 0

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.copy(DEFAULT_CAM_POS)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(DEFAULT_CAM_TARGET)
    controls.enableDamping = !reducedMotion
    controls.dampingFactor = 0.06
    controls.enablePan = false
    controls.minDistance = 4.6
    controls.maxDistance = 12.5
    controls.minPolarAngle = 0.35
    controls.maxPolarAngle = Math.PI - 0.35
    controls.update()

    // Stop camera tween if user drags manually
    const onControlStart = () => {
      if (refs.current) refs.current.targetCam = null
    }
    controls.addEventListener('start', onControlStart)

    // ── 1. 15,000-PARTICLE NEURAL SHELL / ATTRACTOR / SINGULARITY ────────────
    const coreGroup = new THREE.Group()
    scene.add(coreGroup)

    const buffers = buildParticleCloudBuffers()
    const cloudGeom = new THREE.BufferGeometry()
    cloudGeom.setAttribute('position', new THREE.BufferAttribute(buffers.posShell, 3))
    cloudGeom.setAttribute('aPosAttractor', new THREE.BufferAttribute(buffers.posAttractor, 3))
    cloudGeom.setAttribute('aPosSingularity', new THREE.BufferAttribute(buffers.posSingularity, 3))
    cloudGeom.setAttribute('aColShell', new THREE.BufferAttribute(buffers.colShell, 3))
    cloudGeom.setAttribute('aColAttractor', new THREE.BufferAttribute(buffers.colAttractor, 3))
    cloudGeom.setAttribute('aColSingularity', new THREE.BufferAttribute(buffers.colSingularity, 3))
    cloudGeom.setAttribute('aSize', new THREE.BufferAttribute(buffers.aSize, 1))
    cloudGeom.setAttribute('aSeed', new THREE.BufferAttribute(buffers.aSeed, 1))

    const uniforms = {
      uTime: { value: 0 },
      uWAttractor: { value: 0 },
      uWSingularity: { value: 0 },
      uActivity: { value: 0 },
      uDimmed: { value: 1 },
      uError: { value: 0 },
      uLocked: { value: 0 },
      uPixelRatio: { value: dpr },
    }

    const cloudMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const cloudPoints = new THREE.Points(cloudGeom, cloudMat)
    coreGroup.add(cloudPoints)

    // ── 2. SCIENTIFIC WIREFRAME BOUNDING BOX & MEASUREMENT RINGS ─────────────
    const boxGeom = new THREE.BoxGeometry(4.5, 4.5, 4.5)
    const edgesGeom = new THREE.EdgesGeometry(boxGeom)
    boxGeom.dispose()
    const cageMat = new THREE.LineBasicMaterial({
      color: 0x1f3b44,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
    const boundingCage = new THREE.LineSegments(edgesGeom, cageMat)
    coreGroup.add(boundingCage)

    // Fine orbital measurement ellipses
    const ringMats: THREE.LineBasicMaterial[] = []
    const orbitalRings: THREE.LineLoop[] = []
    const ringSpecs = [
      { r: 2.38, rx: 1.05, ry: 0.35, color: 0x22d3ee },
      { r: 2.52, rx: -0.82, ry: 0.95, color: 0x10b981 },
    ]
    for (const spec of ringSpecs) {
      const segs = 128
      const rPts: THREE.Vector3[] = []
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2
        rPts.push(new THREE.Vector3(Math.cos(a) * spec.r, Math.sin(a) * spec.r, 0))
      }
      const rGeom = new THREE.BufferGeometry().setFromPoints(rPts)
      const rMat = new THREE.LineBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const loop = new THREE.LineLoop(rGeom, rMat)
      loop.rotation.set(spec.rx, spec.ry, 0)
      coreGroup.add(loop)
      ringMats.push(rMat)
      orbitalRings.push(loop)
    }

    // Position Lock equatorial ring (visible only when open_positions > 0)
    const lockPts: THREE.Vector3[] = []
    for (let i = 0; i < 128; i++) {
      const a = (i / 128) * Math.PI * 2
      lockPts.push(new THREE.Vector3(Math.cos(a) * 2.75, 0, Math.sin(a) * 2.75))
    }
    const lockRingMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const lockRing = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(lockPts), lockRingMat)
    lockRing.visible = false
    coreGroup.add(lockRing)

    // ── 3. FOUR SILKY BEZIER FIBER BUNDLES (LEFT/RIGHT -> CORE) ──────────────
    const channels = {} as Record<AgentId, FiberChannel>
    for (const id of AGENT_IDS) {
      const built = buildFiberChannel(id)
      scene.add(built.group)
      channels[id] = built.channel
    }

    const timer = new THREE.Timer()
    const tempVec = new THREE.Vector3()
    const targetWeights = { attractor: 0, singularity: 0 }
    const liveState = {
      presentation: derivePresentation(null, true),
      selected: null as AgentId | null,
      reducedMotion,
    }

    const renderOnce = () => {
      if (!disposed) renderer.render(scene, camera)
    }

    controls.addEventListener('change', () => {
      if (liveState.reducedMotion && !disposed) renderOnce()
    })

    refs.current = {
      camera,
      controls,
      uniforms,
      channels,
      cageMat,
      ringMats,
      lockRing,
      lockRingMat,
      targetWeights,
      targetCam: null,
      liveState,
      renderOnce,
    }

    const onContextLost = (e: Event) => {
      e.preventDefault()
      disposed = true
      window.cancelAnimationFrame(rafId)
      setWebglFailed(true)
    }
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false)

    const onMotionChange = (ev: MediaQueryListEvent) => {
      reducedMotion = ev.matches
      liveState.reducedMotion = ev.matches
      controls.enableDamping = !ev.matches
      if (!ev.matches && !rafId && !disposed) {
        rafId = window.requestAnimationFrame(animate)
      } else if (ev.matches) {
        if (rafId) {
          window.cancelAnimationFrame(rafId)
          rafId = 0
        }
        renderOnce()
      }
    }
    mq?.addEventListener?.('change', onMotionChange)

    const resize = () => {
      if (disposed || !container) return
      const w = container.clientWidth
      if (!w) return
      const h = Math.max(460, Math.round(w * 0.6))
      const curDpr = Math.min(window.devicePixelRatio || 1, 2)
      uniforms.uPixelRatio.value = curDpr
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(curDpr)
      renderer.setSize(w, h)
      renderOnce()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const animate = (ts: number) => {
      if (disposed || liveState.reducedMotion) return
      timer.update(ts)
      const dt = Math.min(timer.getDelta(), 0.05)
      const elapsed = timer.getElapsed()
      uniforms.uTime.value = elapsed

      // Smooth morph between Neural Shell / Attractor / Singularity
      const morphSpeed = Math.min(1, dt * 3.8)
      uniforms.uWAttractor.value += (targetWeights.attractor - uniforms.uWAttractor.value) * morphSpeed
      uniforms.uWSingularity.value += (targetWeights.singularity - uniforms.uWSingularity.value) * morphSpeed

      // Smooth camera focus tween (yields immediately if user grabs OrbitControls)
      if (refs.current?.targetCam) {
        const lerpAlpha = Math.min(1, dt * 4.2)
        camera.position.lerp(refs.current.targetCam.pos, lerpAlpha)
        controls.target.lerp(refs.current.targetCam.target, lerpAlpha)
        if (
          camera.position.distanceTo(refs.current.targetCam.pos) < 0.02 &&
          controls.target.distanceTo(refs.current.targetCam.target) < 0.02
        ) {
          refs.current.targetCam = null
        }
      }

      controls.update()

      // Slow dignified rotation driven strictly by real activity (calm still frame when dimmed)
      const p = liveState.presentation
      const rotSpeed = p.dimmed ? 0.0 : p.coreActive ? 0.09 + p.workingCount * 0.035 : 0.022
      coreGroup.rotation.y += dt * rotSpeed
      orbitalRings[0].rotation.z += dt * (p.dimmed ? 0 : 0.14 + p.workingCount * 0.06)
      orbitalRings[1].rotation.z -= dt * (p.dimmed ? 0 : 0.1 + p.workingCount * 0.04)
      if (lockRing.visible) {
        lockRing.rotation.y -= dt * 0.35
      }

      // Stream luminous data packets along active fiber bundles
      for (const id of AGENT_IDS) {
        const ch = channels[id]
        if (!ch.pulsePoints.visible) continue
        const ap = p.agents[id]
        const speed = ap.error ? 0.72 : 0.38
        const outward = id === 'executor' || id === 'reporter'
        const attr = ch.pulseGeom.getAttribute('position') as THREE.BufferAttribute
        for (let k = 0; k < PULSES_PER_AGENT; k++) {
          const curve = ch.curves[k % ch.curves.length]
          const phase = (elapsed * speed + k / PULSES_PER_AGENT + (k % 3) * 0.11) % 1
          const u = outward ? 1 - phase : phase
          curve.getPoint(u, tempVec)
          ch.pulsePositions[k * 3] = tempVec.x
          ch.pulsePositions[k * 3 + 1] = tempVec.y
          ch.pulsePositions[k * 3 + 2] = tempVec.z
        }
        attr.needsUpdate = true
      }

      renderer.render(scene, camera)
      rafId = window.requestAnimationFrame(animate)
    }

    if (!reducedMotion) {
      rafId = window.requestAnimationFrame(animate)
    } else {
      renderOnce()
    }

    return () => {
      disposed = true
      window.cancelAnimationFrame(rafId)
      ro.disconnect()
      mq?.removeEventListener?.('change', onMotionChange)
      controls.removeEventListener('start', onControlStart)
      controls.dispose()
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)

      scene.traverse(obj => {
        if (obj instanceof THREE.Points || obj instanceof THREE.Line || obj instanceof THREE.LineSegments || obj instanceof THREE.LineLoop) {
          obj.geometry?.dispose()
          const mat = obj.material
          const mats = Array.isArray(mat) ? mat : [mat]
          for (const m of mats) m.dispose()
        }
      })

      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
      refs.current = null
    }
  }, [])

  useEffect(() => {
    syncVisuals()
  }, [syncVisuals])

  if (webglFailed) {
    return (
      <div>
        <p className="text-[11px] text-gray-500 px-2 pb-2">{t.view.webglFallback}</p>
        <IsometricOffice state={state} dimmed={dimmed} t={t} locale={locale} desk={desk} />
      </div>
    )
  }

  const activeProj = PROJECTIONS.find(p => p.id === mode) ?? PROJECTIONS[0]
  const isLive = !dimmed && state?.mode === 'live'
  const hasOpen = !dimmed && (state?.portfolio.open_positions ?? 0) > 0

  return (
    <div className="relative w-full overflow-hidden bg-[#030608] border border-[#14242b]">
      {/* Subtle scientific top header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#13232b] bg-[#04090d] font-mono text-[10px]">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-[#10b981] font-bold tracking-[0.2em] uppercase">
            NEXUSCLAW // {activeProj.label}
          </span>
          <span className="text-gray-600 hidden md:inline">· {activeProj.sub}</span>
          {state && (
            <span
              className={`px-1.5 py-0.5 border uppercase tracking-widest font-bold text-[9px] ${
                isLive
                  ? 'border-red-500/60 bg-red-950/40 text-red-400'
                  : 'border-[#f5c542]/50 bg-[#f5c542]/10 text-[#f5c542]'
              }`}
            >
              {isLive ? t.panel.modeLive : t.panel.modeDryRun}
            </span>
          )}
          {hasOpen && (
            <span className="px-1.5 py-0.5 border border-cyan-400/70 bg-cyan-950/60 text-cyan-200 font-bold text-[9px] uppercase tracking-widest animate-pulse">
              ● LOCK ({state?.portfolio.open_positions})
            </span>
          )}
        </div>

        {/* 3 Projection Mode switcher (morphs the 15,000 GPU particles smoothly with zero reload) */}
        <div className="flex items-center gap-1" role="group" aria-label="3D projection mode">
          {PROJECTIONS.map(p => {
            const active = mode === p.id
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => setMode(p.id)}
                className={`px-2 py-0.5 border text-[9px] uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542] ${
                  active
                    ? 'border-[#22d3ee] text-[#22d3ee] bg-cyan-950/40'
                    : 'border-[#182a33] text-gray-500 hover:text-gray-200 hover:border-[#2a4552]'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main 3D WebGL viewport + Left/Right Novakine-style telemetry callouts */}
      <div
        className="relative w-full"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 48%, rgba(16, 185, 129, 0.08) 0%, rgba(3, 6, 8, 0) 62%)',
        }}
      >
        <div
          ref={containerRef}
          className={`w-full cursor-grab active:cursor-grabbing ${dimmed ? 'ao-dimmed' : ''}`}
          role="img"
          aria-label={`${t.pageTitle} (${t.desks[desk]}). ${summary}`}
        />

        {/* Corner technical coordinates (pointer-events-none) */}
        <div className="pointer-events-none absolute top-2.5 left-3 right-3 hidden md:flex items-center justify-between font-mono text-[9px] text-[#355561] tracking-widest">
          <span>{desk === 'quantbot' ? '15D MANIFOLD · XAUUSD / NAS100' : 'SIGNAL PIPELINE · LIVE TELEMETRY'}</span>
          <span>
            {presentation.workingCount}/4 ACTIVE · TIER {state ? t.tiers[state.survival_tier].toUpperCase() : '—'}
          </span>
        </div>

        {/* Left Agent Telemetry Column (Scanner + Analyst) */}
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-5 w-[188px]">
          {(['scanner', 'analyst'] as const).map(id => {
            const agent = byId.get(id) ?? { id, status: 'idle' as const, label: '', last_event_at: null }
            return (
              <AgentTelemetryCard
                key={id}
                agent={agent}
                role={roles[id]}
                statusText={t.status[dimmed ? 'idle' : agent.status]}
                selected={selectedAgent === id}
                dimmed={dimmed}
                now={now}
                locale={locale}
                onSelect={() => setSelectedAgent(prev => (prev === id ? null : id))}
              />
            )
          })}
        </div>

        {/* Right Agent Telemetry Column (Executor + Reporter) */}
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-5 w-[188px]">
          {(['executor', 'reporter'] as const).map(id => {
            const agent = byId.get(id) ?? { id, status: 'idle' as const, label: '', last_event_at: null }
            return (
              <AgentTelemetryCard
                key={id}
                agent={agent}
                role={roles[id]}
                statusText={t.status[dimmed ? 'idle' : agent.status]}
                selected={selectedAgent === id}
                dimmed={dimmed}
                now={now}
                locale={locale}
                onSelect={() => setSelectedAgent(prev => (prev === id ? null : id))}
              />
            )
          })}
        </div>

        {/* Focused Agent Inspector Strip (appears cleanly at bottom when user clicks a card) */}
        {selectedAgent && (
          <div className="absolute bottom-2.5 left-3 right-3 border border-[#f5c542]/50 bg-[#040a0f]/92 backdrop-blur-md px-3.5 py-2.5 font-mono text-[10px] flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[#f5c542] font-bold uppercase tracking-widest">
                  {t.agents[selectedAgent]}
                </span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400 truncate">{roles[selectedAgent]}</span>
              </div>
              <p className="text-gray-200 truncate">
                {selectedEvent
                  ? `${formatClock(selectedEvent.ts, locale)} — ${truncate(selectedEvent.text, 78)}`
                  : t.wall.noActivity}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAgent(null)}
              className="px-2 py-1 border border-[#1f3a45] text-gray-300 hover:border-[#f5c542] hover:text-[#f5c542] text-[9px] uppercase tracking-widest"
            >
              ESC
            </button>
          </div>
        )}
      </div>

      {/* Bottom Execution Tape & Portfolio Micro-Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t border-[#13232b] bg-[#04090d] font-mono text-[10px]">
        <div className="min-w-0 flex-1 truncate text-gray-300">
          <span className="text-[#10b981] uppercase tracking-widest mr-2">{t.wall.activity}</span>
          {latestEvent ? (
            <>
              <span className="text-[#f5c542] mr-2 tabular-nums">{formatClock(latestEvent.ts, locale)}</span>
              <span>{truncate(latestEvent.text, 64)}</span>
            </>
          ) : (
            <span className="text-gray-500">{t.wall.noActivity}</span>
          )}
        </div>
        {state && (
          <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest text-gray-400 shrink-0 tabular-nums">
            <span>
              TRADES <strong className="text-gray-100">{state.portfolio.resolved_trades}</strong>
            </span>
            <span>
              OPEN <strong className={hasOpen ? 'text-cyan-300' : 'text-gray-100'}>{state.portfolio.open_positions}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
