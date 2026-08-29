import { CanvasTexture, SRGBColorSpace } from 'three'
import { MOON_BY_ID, type MoonId, type PlanetId } from '../astronomy/bodies.ts'

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function noise(x: number, y: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash(x0, y0)
  const b = hash(x0 + 1, y0)
  const c = hash(x0, y0 + 1)
  const d = hash(x0 + 1, y0 + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

function fbm(x: number, y: number, octaves: number): number {
  let value = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    value += amp * noise(x * freq, y * freq)
    amp *= 0.5
    freq *= 2
  }
  return value
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

type Painter = (u: number, v: number) => [number, number, number]

function paintTexture(size: number, paint: Painter): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas is not available')
  }
  const image = ctx.createImageData(size, size)
  const data = image.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const [r, g, b] = paint(u, v)
      const i = (y * size + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

export function createSunTexture(): CanvasTexture {
  return paintTexture(512, (u, v) => {
    const n = fbm(u * 8, v * 6, 5)
    const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 10 + n * 4)
    const heat = 0.55 + n * 0.45
    return [
      Math.round(lerp(255, 255, heat)),
      Math.round(lerp(120, 210, heat) * (0.7 + 0.3 * band)),
      Math.round(lerp(20, 70, n)),
    ]
  })
}

export function createEarthTexture(): CanvasTexture {
  return paintTexture(1024, (u, v) => {
    const lat = (v - 0.5) * Math.PI
    const n = fbm(u * 6, v * 3, 6)
    const ice = Math.abs(lat) > 1.15 + n * 0.15
    const land = n > 0.52
    if (ice) return [236, 244, 255]
    if (land) {
      const green = 90 + n * 80
      return [34 + n * 40, green, 40]
    }
    const deep = 0.35 + n * 0.25
    return [10, Math.round(60 + deep * 80), Math.round(130 + deep * 90)]
  })
}

export function createMoonTexture(): CanvasTexture {
  return createSatelliteTexture('moon')
}

export function createSatelliteTexture(id: MoonId): CanvasTexture {
  const [cr, cg, cb] = MOON_BY_ID[id].color
  return paintTexture(512, (u, v) => {
    const n = fbm(u * 10, v * 5, 5)
    const crater = n > 0.72 ? 0.18 : 0
    const shade = 0.55 + n * 0.55 - crater * 0.28
    return [
      Math.round(cr * shade),
      Math.round(cg * shade),
      Math.round(cb * shade),
    ]
  })
}

export function createPlanetTexture(id: PlanetId): CanvasTexture {
  switch (id) {
    case 'mercury':
      return paintTexture(512, (u, v) => {
        const n = fbm(u * 9, v * 5, 5)
        const gray = 88 + n * 90
        return [gray + 12, gray, gray - 8]
      })
    case 'venus':
      return paintTexture(512, (u, v) => {
        const n = fbm(u * 5, v * 4, 5)
        const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 8 + n * 3)
        return [Math.round(210 + n * 30), Math.round(160 + band * 40), Math.round(80 + n * 20)]
      })
    case 'earth':
      return createEarthTexture()
    case 'mars':
      return paintTexture(512, (u, v) => {
        const lat = (v - 0.5) * Math.PI
        const n = fbm(u * 7, v * 4, 5)
        if (Math.abs(lat) > 1.25 + n * 0.1) return [230, 230, 236]
        return [Math.round(140 + n * 80), Math.round(50 + n * 40), Math.round(30 + n * 20)]
      })
    case 'jupiter':
      return paintTexture(1024, (u, v) => {
        const n = fbm(u * 4, v * 10, 5)
        const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 14 + n * 2.4)
        const spot = Math.hypot(u - 0.62, (v - 0.58) * 2) < 0.06 + n * 0.02
        if (spot) return [196, 92, 62]
        return [
          Math.round(lerp(186, 230, band)),
          Math.round(lerp(140, 190, band) * (0.85 + n * 0.15)),
          Math.round(lerp(90, 130, n)),
        ]
      })
    case 'saturn':
      return paintTexture(512, (u, v) => {
        const n = fbm(u * 3, v * 8, 4)
        const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 12 + n * 2)
        return [
          Math.round(lerp(196, 230, band)),
          Math.round(lerp(170, 200, band)),
          Math.round(lerp(110, 140, n)),
        ]
      })
    case 'uranus':
      return paintTexture(512, (u, v) => {
        const n = fbm(u * 3, v * 3, 4)
        return [Math.round(150 + n * 30), Math.round(200 + n * 25), Math.round(210 + n * 20)]
      })
    case 'neptune':
      return paintTexture(512, (u, v) => {
        const n = fbm(u * 4, v * 4, 4)
        const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 6 + n * 2)
        return [Math.round(40 + n * 20), Math.round(70 + band * 50), Math.round(170 + n * 40)]
      })
  }
}

export function createMilkyWayTexture(): CanvasTexture {
  const width = 1024
  const height = 512
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas is not available')
  }
  const image = ctx.createImageData(width, height)
  const data = image.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width
      const v = y / height
      const n = fbm(u * 10, v * 4, 5)
      const band = Math.exp(-(((v - 0.5) * 11) ** 2))
      const du = Math.min(u, 1 - u)
      const bulge = Math.exp(-(((du * 22) ** 2))) * Math.exp(-(((v - 0.5) * 16) ** 2))
      const dust = n * band
      const glow = band * 0.42 + bulge * 0.55
      const i = (y * width + x) * 4
      data[i] = Math.round(lerp(28, 110, glow) + bulge * 40 + dust * 18)
      data[i + 1] = Math.round(lerp(30, 72, glow) + bulge * 8 + dust * 10)
      data[i + 2] = Math.round(lerp(48, 96, glow) + bulge * 22 + dust * 14)
      data[i + 3] = Math.round(Math.min(255, (band * 0.4 + bulge * 0.28 + dust * 0.14) * 255))
    }
  }

  ctx.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}
