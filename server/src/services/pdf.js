import { PDFDocument } from 'pdf-lib'
import { badRequest } from '../utils/AppError.js'
import { sha256Hex } from '../utils/crypto.js'

const MAX_PAGES = 3000

// Validates an uploaded PDF and extracts what the admin form can pre-fill. Rejects anything that is
// not a well-formed, readable, unencrypted PDF, regardless of the file name or declared type.
export async function inspectPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8 || buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw badRequest('That file is not a PDF')
  }
  // pdf-lib is lenient while loading and may only fail later, so everything that reads the document is guarded.
  let pdf
  let pages
  let title
  let author
  try {
    pdf = await PDFDocument.load(buffer, { ignoreEncryption: false, updateMetadata: false })
    pages = pdf.getPageCount()
    title = cleanTitle(pdf.getTitle())
    author = pdf.getAuthor() || undefined
  } catch (err) {
    const encrypted = /encrypt/i.test(err?.message ?? '')
    throw badRequest(encrypted ? 'Password-protected PDFs are not supported. Remove the password and upload again.' : 'This PDF is damaged or cannot be read')
  }
  if (!(pages >= 1)) throw badRequest('This PDF has no pages')
  if (pages > MAX_PAGES) throw badRequest(`PDFs over ${MAX_PAGES} pages are not supported`)
  return { pages, title, author, size: buffer.length, sha256: sha256Hex(buffer) }
}

function cleanTitle(value) {
  const title = (value ?? '').replace(/\.pdf$/i, '').replace(/\s+/g, ' ').trim()
  // Generic exporter titles ("Untitled", "Microsoft Word - x.docx") are not useful suggestions.
  return !title || /^(untitled|microsoft word|document\d*)/i.test(title) ? undefined : title.slice(0, 160)
}

// "Class 11 - Kinematics_notes.pdf" -> "Class 11 Kinematics notes"
export const titleFromFilename = (name = '') =>
  name
    .replace(/\.pdf$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s*[-–]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
    .slice(0, 160)

export const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70)
    .replace(/^-|-$/g, '')

// Images are accepted by content, not by extension or declared type. SVG is refused: it can carry scripts.
export function sniffImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp'
  return null
}
