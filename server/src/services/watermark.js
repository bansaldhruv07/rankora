import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { maskEmail } from '../utils/crypto.js'

// The built-in PDF font only encodes basic Latin, so anything else is replaced.
export const toLatin = (text) =>
  String(text)
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[^ -~]/g, '?')

// What identifies a reader on every page. Built on the server from the authenticated account and
// the order, never from anything the client sends.
export function watermarkIdentity({ user, orderRef }) {
  return {
    name: user.name,
    masked: maskEmail(user.email),
    studentId: String(user._id).slice(-8).toUpperCase(),
    orderRef,
  }
}

// Tiles the identity diagonally across every page (so a crop of any region still carries it) and adds
// a footer line. Applied to a derived copy only; the stored original is never modified.
// This deters sharing and makes leaks traceable. It cannot stop screenshots or re-typing.
export async function watermarkPdf(buffer, identity) {
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const tile = toLatin(`${identity.name} | ${identity.masked} | ID ${identity.studentId} | ${identity.orderRef}`)
  const footer = toLatin(`Licensed to ${identity.name} (${identity.masked}) | ID ${identity.studentId} | ${identity.orderRef} | Rankora`)
  const grey = rgb(0.35, 0.35, 0.38)

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize()
    const size = Math.max(9, Math.min(12, Math.min(width, height) / 50))
    const textWidth = font.widthOfTextAtSize(tile, size)
    const stepX = textWidth + 70
    const stepY = Math.max(130, height / 6)
    let row = 0
    for (let y = -stepY; y < height + stepX; y += stepY, row += 1) {
      // Alternate rows are shifted so the pattern has no straight vertical seams to crop along.
      for (let x = -stepX + (row % 2) * (stepX / 2); x < width; x += stepX) {
        page.drawText(tile, { x, y, size, font, color: grey, opacity: 0.16, rotate: degrees(32) })
      }
    }
    page.drawText(footer, { x: 18, y: 8, size: 6.5, font, color: grey, opacity: 0.75 })
  }
  pdf.setSubject(`licensed:${identity.studentId}`)
  pdf.setKeywords([identity.studentId, identity.orderRef])
  return Buffer.from(await pdf.save({ useObjectStreams: true }))
}

// Free sample: ONLY the chosen (free) pages, stamped "SAMPLE". Locked pages are never copied into this file,
// so they cannot be recovered from what the browser receives. 1-based page numbers.
export async function buildSamplePdf(buffer, pageNumbers) {
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false })
  const valid = [...new Set(pageNumbers)].filter((n) => Number.isInteger(n) && n >= 1 && n <= source.getPageCount()).sort((a, b) => a - b)
  if (valid.length === 0) throw new Error('No valid preview pages')
  const out = await PDFDocument.create()
  const font = await out.embedFont(StandardFonts.HelveticaBold)
  const pages = await out.copyPages(source, valid.map((n) => n - 1))
  for (const page of pages) {
    out.addPage(page)
    const { width, height } = page.getSize()
    const size = Math.min(width, height) / 6
    const w = font.widthOfTextAtSize('SAMPLE', size)
    page.drawText('SAMPLE', {
      x: width / 2 - (w / 2) * Math.cos(Math.PI / 5),
      y: height / 2 - (w / 2) * Math.sin(Math.PI / 5),
      size,
      font,
      color: rgb(0.45, 0.45, 0.5),
      opacity: 0.1,
      rotate: degrees(36),
    })
    page.drawText('Free sample from Rankora', { x: 18, y: 8, size: 7, font, color: rgb(0.4, 0.4, 0.45), opacity: 0.8 })
  }
  return Buffer.from(await out.save({ useObjectStreams: true }))
}
