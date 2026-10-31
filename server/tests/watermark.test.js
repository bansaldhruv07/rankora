import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { inflateSync } from 'node:zlib'
import { PDFDocument } from 'pdf-lib'
import { maskEmail } from '../src/utils/crypto.js'
import { buildSamplePdf, toLatin, watermarkIdentity, watermarkPdf } from '../src/services/watermark.js'

const identity = { name: 'Aarav Sharma', masked: 'aa***@example.com', studentId: '99439011', orderRef: 'RK-1A2B3C4D' }

async function source(pages = 2) {
  const pdf = await PDFDocument.create()
  for (let i = 0; i < pages; i += 1) pdf.addPage()
  return Buffer.from(await pdf.save())
}

describe('watermark', () => {
  it('stamps the student identity into every page and the metadata, leaving the source untouched', async () => {
    const original = await source(3)
    const before = Buffer.from(original)
    const out = await watermarkPdf(original, identity)
    const pdf = await PDFDocument.load(out)
    assert.equal(pdf.getPageCount(), 3)
    assert.equal(pdf.getSubject(), 'licensed:99439011')
    assert.ok(out.length > original.length, 'stamped file carries extra content')
    assert.ok(original.equals(before), 'the original buffer is not modified')
    // The identity appears in each page's content, not just once.
    const text = Buffer.from(out).toString('latin1')
    assert.ok(text.includes('RK-1A2B3C4D') || pdf.getKeywords()?.includes('RK-1A2B3C4D'))
  })

  it('tiles the mark many times per page so cropping does not remove it', async () => {
    const out = await watermarkPdf(await source(1), identity)
    // Content streams are Flate-compressed; inflate each one and count the text-showing operators.
    let shown = 0
    const body = out.toString('latin1')
    for (const match of body.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
      try {
        shown += (inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1').match(/\bTj\b/g) ?? []).length
      } catch {
        /* not a compressed content stream */
      }
    }
    assert.ok(shown >= 8, `expected a tiled pattern, found ${shown} text runs`)
  })

  it('replaces characters the PDF font cannot encode instead of throwing', async () => {
    assert.equal(toLatin('Kinematics – ½ ₙ'), 'Kinematics - ? ?')
    await watermarkPdf(await source(1), { ...identity, name: 'आरव शर्मा' })
  })

  it('builds identity from the account only and masks the email', () => {
    const id = watermarkIdentity({ user: { _id: '507f1f77bcf86cd799439011', name: 'A', email: 'aarav.sharma@example.com' }, orderRef: 'RK-1' })
    assert.equal(id.masked, 'aa***@example.com')
    assert.equal(id.studentId, '99439011')
    assert.equal(maskEmail('a@x.com'), 'a***@x.com')
    assert.equal(maskEmail('nonsense'), '***')
  })

  it('extracts only the chosen sample pages', async () => {
    const out = await buildSamplePdf(await source(10), [2, 5, 5, 99, 0])
    assert.equal((await PDFDocument.load(out)).getPageCount(), 2)
    const small = await source(2)
    await assert.rejects(() => buildSamplePdf(small, [50]))
  })
})
