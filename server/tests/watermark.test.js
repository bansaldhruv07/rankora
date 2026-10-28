import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { toLatin, watermarkPdf } from '../src/services/watermark.js'

describe('watermark', () => {
  it('stamps the buyer identity into every page and the metadata', async () => {
    const source = await PDFDocument.create()
    source.addPage()
    source.addPage()
    const out = await watermarkPdf(Buffer.from(await source.save()), { email: 'buyer@example.com', userId: '507f1f77bcf86cd799439011', orderRef: 'note-1' })
    const pdf = await PDFDocument.load(out)
    assert.equal(pdf.getPageCount(), 2)
    assert.equal(pdf.getSubject(), 'licensed:507f1f77bcf86cd799439011')
    assert.ok(out.length > (await source.save()).length, 'stamped file should carry extra content')
  })

  it('replaces characters the PDF font cannot encode instead of throwing', async () => {
    assert.equal(toLatin('Kinematics – ½ ₙ'), 'Kinematics - ? ?')
    const source = await PDFDocument.create()
    source.addPage()
    await watermarkPdf(Buffer.from(await source.save()), { email: 'ünï@example.com', userId: 'u1', orderRef: 'x' })
  })
})
