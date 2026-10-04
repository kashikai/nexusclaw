const COS30 = Math.cos(Math.PI / 6)

export type Pt = [number, number]

/** World (x, y, z) in floor units → SVG screen coords. +x runs right-down, +y left-down, +z up. */
export function iso(x: number, y: number, z = 0): Pt {
  return [(x - y) * COS30, (x + y) * 0.5 - z]
}

export function pts(...points: Pt[]): string {
  return points.map(([a, b]) => `${a.toFixed(3)},${b.toFixed(3)}`).join(' ')
}

/** SVG matrix that maps local (u right, v down) units onto the back-right wall plane (y = 0). */
export function wallYMatrix(x: number, zTop: number): string {
  const [ox, oy] = iso(x, 0, zTop)
  return `matrix(${COS30} 0.5 0 1 ${ox} ${oy})`
}

/** SVG matrix that maps local (u right, v down) units onto the back-left wall plane (x = 0), reading toward the back corner. */
export function wallXMatrix(y: number, zTop: number): string {
  const [ox, oy] = iso(0, y, zTop)
  return `matrix(${COS30} -0.5 0 1 ${ox} ${oy})`
}

export interface BoxColors {
  top: string
  faceX: string
  faceY: string
  stroke?: string
}

interface BoxProps extends BoxColors {
  x: number
  y: number
  z?: number
  w: number
  d: number
  h: number
  strokeWidth?: number
  className?: string
}

/** Axis-aligned box; draws the three faces visible from the +x/+y/+z viewpoint. */
export function Box({ x, y, z = 0, w, d, h, top, faceX, faceY, stroke, strokeWidth = 0.02, className }: BoxProps) {
  const sp = { stroke: stroke ?? 'none', strokeWidth, strokeLinejoin: 'round' as const }
  return (
    <g className={className}>
      <polygon points={pts(iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h))} fill={faceY} {...sp} />
      <polygon points={pts(iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h))} fill={faceX} {...sp} />
      <polygon points={pts(iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h))} fill={top} {...sp} />
    </g>
  )
}

/** Shades a hex colour by a factor (<1 darker) for box side faces. */
export function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)))
  const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function boxColors(hex: string, stroke?: string): BoxColors {
  return { top: hex, faceX: shade(hex, 0.72), faceY: shade(hex, 0.55), stroke }
}
