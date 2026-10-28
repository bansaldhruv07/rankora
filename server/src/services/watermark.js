import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'

// The built-in PDF font only encodes basic Latin, so anything else is replaced.
export const toLatin = (text) =>
  String(text)
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[^ -~]/g, '?')

// Stamps every page with the buyer's identity (diagonal + footer) and embeds it in metadata.
// This deters casual sharing and makes leaks traceable; it cannot stop screenshots or re-typing.
export async function watermarkPdf(buffer, { email, userId, orderRef }) {
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const stamp = toLatin(`Licensed to ${email}`)
  const footer = toLatin(`${email} | ${String(userId).slice(-8)} | ${orderRef} | ${new Date().toISOString().slice(0, 10)}`)

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize()
    const size = Math.max(18, Math.min(width, height) / 18)
    page.drawText(stamp, {
      x: width * 0.12,
      y: height * 0.3,
      size,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.18,
      rotate: degrees(40),
    })
    page.drawText(footer, { x: 24, y: 12, size: 7, font, color: rgb(0.4, 0.4, 0.4), opacity: 0.7 })
  }
  pdf.setSubject(`licensed:${userId}`)
  pdf.setKeywords([String(userId), orderRef])
  return Buffer.from(await pdf.save())
}
