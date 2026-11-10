import { useMemo } from 'react'

const escapeXml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])

// Builds one repeating tile as an SVG image. The identity text comes from the server's session
// response; the per-session seed varies the angle, spacing and offset so no two sessions line up.
function buildTile(watermark, night, zoom) {
  const seed = watermark.seed || 0
  const angle = -(24 + (seed % 13))
  const w = Math.round((400 + (seed % 41)) * zoom)
  const h = Math.round((280 + ((seed >> 3) % 37)) * zoom)
  const fill = night ? 'rgba(255,255,255,0.10)' : 'rgba(20,33,61,0.06)'
  const size = Math.round(11 * Math.min(1.25, Math.max(0.9, zoom)))
  const lines = watermark.label
    ? [watermark.label, 'JEEdge free sample']
    : [`${watermark.name} · ${watermark.masked}`, `ID ${watermark.studentId} · ${watermark.orderRef}`]
  const block = (x, y) =>
    `<g transform="translate(${x} ${y}) rotate(${angle})" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="600" fill="${fill}">` +
    `<text font-size="${size}">${escapeXml(lines[0])}</text><text y="${size + 4}" font-size="${size - 1.5}">${escapeXml(lines[1])}</text></g>`
  // The second block is offset by half a tile so rows are staggered rather than aligned in columns.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${block(w / 2, h * 0.3)}${block(0, h * 0.8)}${block(w, h * 0.8)}</svg>`
  return { url: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`, w, h, offsetX: (seed * 7) % w, offsetY: (seed * 13) % h }
}

export default function WatermarkLayer({ watermark, night = false, zoom = 1 }) {
  // Rounded to the nearest step so the tile is not rebuilt on every pixel of a pinch/zoom.
  const step = Math.round(zoom * 4) / 4
  const tile = useMemo(() => buildTile(watermark, night, step), [watermark, night, step])
  const footer = watermark.label ? 'Free sample from JEEdge' : `Licensed to ${watermark.name} · ${watermark.orderRef}`

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: tile.url, backgroundSize: `${tile.w}px ${tile.h}px`, backgroundPosition: `${tile.offsetX}px ${tile.offsetY}px` }} />
      <p className={`absolute inset-x-0 bottom-1 truncate px-3 text-center text-[9px] font-medium ${night ? 'text-white/30' : 'text-ink-900/25'}`}>{footer}</p>
    </div>
  )
}
