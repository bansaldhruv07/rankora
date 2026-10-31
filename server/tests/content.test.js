import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { client, makeProduct, resetDb, startDb, stopDb } from './helpers.js'

const { Product } = await import('../src/models/Product.js')

const makeBundle = (slug, items, price, extra = {}) =>
  Product.create({ slug, title: `Bundle ${slug}`, kind: 'bundle', type: 'bundle', pricePaise: price * 100, status: 'published', bundleItems: items.map((p) => p._id), ...extra })

describe('public catalogue', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  it('lists only published products, with pagination, filters and no private data', async () => {
    await makeProduct({ slug: 'free-note', price: 0, subject: 'physics' })
    await makeProduct({ slug: 'paid-note', price: 99, subject: 'chemistry' })
    await makeProduct({ slug: 'draft-note', price: 99, status: 'draft' })
    await makeProduct({ slug: 'archived-note', price: 99, status: 'archived' })
    const all = await client().get('/api/products?limit=1&page=1')
    assert.equal(all.status, 200)
    assert.equal(all.body.data.length, 1)
    assert.equal(all.body.meta.total, 2)
    const paid = await client().get('/api/products?price=paid')
    assert.deepEqual(paid.body.data.map((p) => p.slug), ['paid-note'])
    assert.equal(paid.body.data[0].price, 99)
    const text = JSON.stringify((await client().get('/api/products')).body)
    assert.ok(!text.includes('notes/'), 'storage key leaked')
    assert.ok(!text.includes('"file"') && !text.includes('hasFile') && !text.includes('fileHistory'))
    assert.equal((await client().get('/api/products/draft-note')).status, 404)
    assert.equal((await client().get('/api/products/archived-note')).status, 404)
  })

  it('filters by subject, class, chapter, tag and text, and sorts', async () => {
    await makeProduct({ slug: 'p11', price: 100, subject: 'physics', classLevel: '11', chapter: 'Kinematics', tags: ['motion'], sortOrder: 2 })
    await makeProduct({ slug: 'p12', price: 300, subject: 'physics', classLevel: '12', chapter: 'Optics', tags: ['light'], sortOrder: 1 })
    await makeProduct({ slug: 'pboth', price: 200, subject: 'physics', classLevel: 'both', chapter: 'Waves', sortOrder: 3 })
    await makeProduct({ slug: 'c12', price: 50, subject: 'chemistry', classLevel: '12', chapter: 'Optical isomerism' })
    const slugs = async (q) => (await client().get(`/api/products?${q}`)).body.data.map((p) => p.slug)
    assert.deepEqual(await slugs('subject=physics'), ['p12', 'p11', 'pboth'], 'default order is display priority')
    assert.deepEqual(await slugs('subject=physics&class=11'), ['p11', 'pboth'], 'class 11 includes notes for both')
    assert.deepEqual(await slugs('class=12&subject=chemistry'), ['c12'])
    assert.deepEqual(await slugs('chapter=Optics'), ['p12'])
    assert.deepEqual(await slugs('tag=light'), ['p12'])
    assert.deepEqual((await slugs('q=optic')).sort(), ['c12', 'p12'])
    assert.deepEqual(await slugs('subject=physics&sort=price-desc'), ['p12', 'pboth', 'p11'])
    assert.deepEqual(await slugs('subject=physics&sort=price-asc'), ['p11', 'pboth', 'p12'])
    assert.deepEqual(await slugs('q=.*'), [], 'search text is matched literally')
    assert.equal((await client().get('/api/products?class=13')).status, 400)
    assert.equal((await client().get('/api/products?sort=hacked')).status, 400)
  })

  it('only shows a discount when one genuinely exists', async () => {
    await makeProduct({ slug: 'honest', price: 100, mrp: undefined })
    await makeProduct({ slug: 'discounted', price: 150, mrpPaise: 30000 })
    const res = await client().get('/api/products')
    const by = Object.fromEntries(res.body.data.map((p) => [p.slug, p]))
    assert.equal(by.honest.savings, null)
    assert.equal(by.honest.mrp, null)
    assert.deepEqual(by.discounted.savings, { amount: 150, percent: 50, referencePrice: 300 })
  })

  it('measures bundle savings against the notes bought separately', async () => {
    const [a, b, c] = await Promise.all(['a', 'b', 'c'].map((s) => makeProduct({ slug: `note-${s}`, price: 100 })))
    const d = await makeProduct({ slug: 'note-draft', price: 100, status: 'draft' })
    await makeBundle('pack', [a, b, c], 240)
    await makeBundle('pack-with-draft', [a, d], 150)
    const res = await client().get('/api/products?kind=bundle&sort=price-asc')
    const pack = res.body.data.find((p) => p.slug === 'pack')
    assert.equal(pack.items.length, 3)
    assert.equal(pack.separatePrice, 300)
    assert.deepEqual(pack.savings, { amount: 60, percent: 20, referencePrice: 300 })
    const partial = res.body.data.find((p) => p.slug === 'pack-with-draft')
    assert.equal(partial.items.length, 1, 'unpublished notes are never listed')
    assert.equal(partial.savings, null, 'no saving against a single note that costs the same')
    assert.ok(!JSON.stringify(res.body).includes('notes/'))
  })

  it('recommends bundles that contain a note, and related notes from the same subject', async () => {
    const a = await makeProduct({ slug: 'a', price: 100, subject: 'physics', classLevel: '11' })
    const b = await makeProduct({ slug: 'b', price: 100, subject: 'physics', classLevel: '12' })
    await makeProduct({ slug: 'c', price: 100, subject: 'physics', classLevel: '11' })
    await makeProduct({ slug: 'z', price: 100, subject: 'chemistry', classLevel: '11' })
    await makeBundle('physics-pack', [a, b], 180)
    const detail = (await client().get('/api/products/a')).body.data
    assert.deepEqual(detail.bundles.map((p) => p.slug), ['physics-pack'])
    assert.equal(detail.bundles[0].savings.amount, 20)
    assert.deepEqual(detail.related.map((p) => p.slug), ['c', 'b'], 'same class first, same subject only')
    assert.equal(detail.premiumIncluded, true)
    const none = (await client().get('/api/products/z')).body.data
    assert.deepEqual(none.bundles, [])
  })

  it('builds a subject > class > chapter tree from published notes', async () => {
    await makeProduct({ slug: 'a', price: 1, subject: 'physics', classLevel: '11', chapter: 'Kinematics' })
    await makeProduct({ slug: 'b', price: 1, subject: 'physics', classLevel: '11', chapter: 'Kinematics' })
    await makeProduct({ slug: 'c', price: 1, subject: 'physics', classLevel: '12', chapter: 'Optics' })
    await makeProduct({ slug: 'd', price: 1, subject: 'physics', classLevel: '12', chapter: 'Hidden', status: 'draft' })
    const tree = (await client().get('/api/products/catalog')).body.data
    assert.equal(tree.physics.count, 3)
    assert.deepEqual(tree.physics.classes, { 11: 2, 12: 1 })
    assert.deepEqual(tree.physics.chapters.map((c) => [c.chapter, c.count]), [['Kinematics', 2], ['Optics', 1]])
  })

  it('counts a page view once per visitor and note, and ignores bots', async () => {
    await makeProduct({ slug: 'seen', price: 10 })
    for (let i = 0; i < 3; i += 1) await client().get('/api/products/seen')
    await client().get('/api/products/seen').set('User-Agent', 'Googlebot/2.1')
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal((await Product.findOne({ slug: 'seen' })).viewCount, 1)
  })

  it('rejects malformed slugs and unknown notes cleanly', async () => {
    for (const slug of ['nope', 'UPPER', '..%2F..%2Fetc', 'a%00b']) {
      assert.equal((await client().get(`/api/products/${slug}`)).status, 404, slug)
    }
    assert.equal((await client().get('/api/products/nope/cover')).status, 404)
  })
})
