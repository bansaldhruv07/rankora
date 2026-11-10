// Puts the catalogue in JEE order, prices the hard chapters, builds bundles and creates the launch coupons.
// Safe to re-run whenever you upload new notes: it only fixes what is out of place.
//
//   node scripts/organize-catalog.js            dry run: prints exactly what would change, writes nothing
//   node scripts/organize-catalog.js --apply    makes the changes (a backup of old values goes to server/backups/)
//
// What it does
//   1. Matches each note to a chapter by its title and sets `chapter` and `sortOrder` to the NCERT book order
//      (Class 11 then Class 12, Physics, then Chemistry, then Mathematics).
//   2. Chapters marked `hard` below get difficulty "Hard" and the hard-chapter price (₹99 selling, ₹199 original).
//      Other notes keep the price they have.
//   3. Creates or extends bundles from the notes that exist. Bundle prices are a fixed % below the sum of the
//      notes' selling prices, so the "you save" figure shown on the site is true. Existing bundles are never
//      repriced; only newly matching notes are added (and existing buyers get them).
//   4. Creates the coupons in COUPONS if they do not exist yet.
//   5. Takes the old Premium subscription plans off sale (there is no subscription).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { assertEnv, env } from '../src/config/env.js'
import { Coupon } from '../src/models/Coupon.js'
import { Order } from '../src/models/Order.js'
import { Product } from '../src/models/Product.js'
import { extendBundleBuyers } from '../src/services/entitlements.js'

const APPLY = process.argv.includes('--apply')

// ---------------------------------------------------------------------------------------------
// Settings you may want to change
// ---------------------------------------------------------------------------------------------
const HARD_PRICE = 99 // selling price of a hard chapter (rupees)
const HARD_MRP = 199 // original price shown struck through

// `m` is matched against the note title (lower case, punctuation turned into spaces). `hard` marks the chapters
// students find toughest. Order in each list = book order.
const CHAPTERS = {
  physics: [
    { name: 'Units and Measurements', m: /physical world|units? and meas|^units|^measurements?/ },
    { name: 'Kinematics', m: /motion in (1|one) ?d|motion in a (straight|plane)|kinematics/, hard: true },
    { name: 'Laws of Motion', m: /laws? of motion/, hard: true },
    { name: 'Work, Energy and Power', m: /work (power|energy)/ },
    { name: 'Rotational Motion', m: /rotational|system of particles/, hard: true },
    { name: 'Gravitation', m: /gravitation/ },
    { name: 'Mechanical Properties of Solids', m: /properties of solids/ },
    { name: 'Mechanical Properties of Fluids', m: /properties of fluids|fluid/ },
    { name: 'Thermal Properties of Matter', m: /thermal properties/ },
    { name: 'Thermodynamics', m: /^thermodynamics/, hard: true },
    { name: 'Kinetic Theory of Gases', m: /kinetic theory/ },
    { name: 'Oscillations', m: /oscillation|simple harmonic/ },
    { name: 'Waves', m: /^waves?( |$)/ },
    { name: 'Electrostatics', m: /^electrostatics|electric (charges|field)/, hard: true },
    { name: 'Electric Potential and Capacitance', m: /potential|capacit/, hard: true },
    { name: 'Current Electricity', m: /current electricity/, hard: true },
    { name: 'Magnetic Effects of Current', m: /magnetic effects|moving charges|magnetism/, hard: true },
    { name: 'Electromagnetic Induction', m: /electromagnetic induction|^emi( |$)/, hard: true },
    { name: 'Alternating Current', m: /alternating/ },
    { name: 'Electromagnetic Waves', m: /electromagnetic waves/ },
    { name: 'Ray Optics', m: /ray optics/, hard: true },
    { name: 'Wave Optics', m: /wave optics/ },
    { name: 'Dual Nature of Radiation and Matter', m: /dual nature/ },
    { name: 'Atoms and Nuclei', m: /atoms? and nucle|^atoms|^nuclei/ },
    { name: 'Semiconductor Electronics', m: /semiconductor|electronic devices/ },
    { name: 'Experimental Physics', m: /experiment|practical/ },
  ],
  chemistry: [
    { name: 'Some Basic Concepts of Chemistry', m: /basic concepts|mole concept/ },
    { name: 'Atomic Structure', m: /atomic structure|structure of atom/ },
    { name: 'Periodic Table and Periodicity', m: /periodic|classification of elements/ },
    { name: 'Chemical Bonding', m: /bonding|molecular structure/, hard: true },
    { name: 'States of Matter', m: /states of matter/ },
    { name: 'Chemical Thermodynamics', m: /thermodynamics/, hard: true },
    { name: 'Chemical Equilibrium', m: /^chemical equilibrium|^equilibrium/, hard: true },
    { name: 'Ionic Equilibrium', m: /ionic equilibrium/, hard: true },
    { name: 'Redox Reactions', m: /redox reactions?/ },
    { name: 'General Organic Chemistry', m: /general organic|^goc/, hard: true },
    { name: 'Hydrocarbons', m: /hydrocarbon/ },
    { name: 'Solutions', m: /^solutions?/ },
    { name: 'Electrochemistry', m: /electrochem/, hard: true },
    { name: 'Chemical Kinetics', m: /kinetics/ },
    { name: 'd and f Block Elements', m: /d and f|d block|f block/ },
    { name: 'Coordination Compounds', m: /coordination/, hard: true },
    { name: 'Haloalkanes and Haloarenes', m: /halo/ },
    { name: 'Alcohols, Phenols and Ethers', m: /alcohol|phenol/ },
    { name: 'Aldehydes, Ketones and Carboxylic Acids', m: /aldehyde|ketone|carboxylic/, hard: true },
    { name: 'Amines', m: /amines?/ },
    { name: 'Biomolecules', m: /biomolecule/ },
  ],
  mathematics: [
    { name: 'Sets, Relations and Functions', m: /sets|relations|functions/ },
    { name: 'Complex Numbers', m: /complex/, hard: true },
    { name: 'Quadratic Equations', m: /quadratic/ },
    { name: 'Sequences and Series', m: /sequences?|series/ },
    { name: 'Permutations and Combinations', m: /permutation|combination/, hard: true },
    { name: 'Binomial Theorem', m: /binomial/ },
    { name: 'Matrices and Determinants', m: /matrices|determinant/ },
    { name: 'Limits, Continuity and Differentiability', m: /limits?|continuity|differentiab/ },
    { name: 'Application of Derivatives', m: /application of derivatives|^derivatives/, hard: true },
    { name: 'Integral Calculus', m: /integra/, hard: true },
    { name: 'Differential Equations', m: /differential equations?/, hard: true },
    { name: 'Straight Lines', m: /straight lines?/ },
    { name: 'Circles', m: /circles?/ },
    { name: 'Conic Sections', m: /conic|parabola|ellipse|hyperbola/, hard: true },
    { name: 'Vector Algebra', m: /vector/ },
    { name: 'Three Dimensional Geometry', m: /three dimension|3 ?d geometry/, hard: true },
    { name: 'Probability', m: /probability/, hard: true },
    { name: 'Statistics', m: /statistics/ },
  ],
}
const SUBJECT_BASE = { physics: 100, chemistry: 1000, mathematics: 2000 }
const STEP = 10

// `price` / `mrp` (rupees) are fixed offers: a complete subject is ₹999 (worth about ₹1,499) and all three subjects
// are ₹2,499. Bundles without a fixed price are `discount` (a fraction) below the sum of their notes' selling prices,
// always more than the cart's own volume discount (10 / 15 / 20 %) so a bundle is worth buying.
const BUNDLES = [
  { slug: 'physics-complete', subject: 'physics', classLevel: 'both', chapters: 'ALL', price: 999, mrp: 1499, sortOrder: 1,
    title: 'Complete Physics: Class 11 and 12',
    summary: 'Every Physics chapter in one pack, in book order. Revise the whole subject before JEE.' },
  { slug: 'physics-toughest-chapters', subject: 'physics', classLevel: 'both', chapters: 'HARD', discount: 0.3, sortOrder: 2,
    title: 'Toughest Physics Chapters Pack',
    summary: 'The chapters students find hardest, together at a lower price.' },
  { slug: 'physics-mechanics', subject: 'physics', classLevel: '11', discount: 0.3, sortOrder: 3,
    chapters: ['Kinematics', 'Laws of Motion', 'Work, Energy and Power', 'Rotational Motion', 'Gravitation'],
    title: 'Mechanics Pack',
    summary: 'Kinematics to Gravitation: the core mechanics chapters in one pack.' },
  { slug: 'physics-electricity-magnetism', subject: 'physics', classLevel: '12', discount: 0.3, sortOrder: 4,
    chapters: ['Electrostatics', 'Electric Potential and Capacitance', 'Current Electricity', 'Magnetic Effects of Current', 'Electromagnetic Induction', 'Alternating Current'],
    title: 'Electricity and Magnetism Pack',
    summary: 'Electrostatics through Alternating Current, all in one pack.' },
  { slug: 'physics-heat-matter-waves', subject: 'physics', classLevel: '11', discount: 0.3, sortOrder: 5,
    chapters: ['Mechanical Properties of Solids', 'Mechanical Properties of Fluids', 'Thermodynamics', 'Kinetic Theory of Gases', 'Waves'],
    title: 'Heat, Matter and Waves Pack',
    summary: 'Properties of matter, thermodynamics, kinetic theory and waves together.' },
  { slug: 'physics-optics-modern', subject: 'physics', classLevel: '12', discount: 0.3, sortOrder: 6,
    chapters: ['Electromagnetic Waves', 'Ray Optics', 'Wave Optics', 'Dual Nature of Radiation and Matter', 'Atoms and Nuclei', 'Semiconductor Electronics'],
    title: 'Optics and Modern Physics Pack',
    summary: 'Optics and modern physics chapters in one pack.' },
  { slug: 'chemistry-complete', subject: 'chemistry', classLevel: 'both', chapters: 'ALL', price: 999, mrp: 1499, sortOrder: 7,
    title: 'Complete Chemistry: Class 11 and 12',
    summary: 'Every Chemistry chapter in one pack, in book order. Revise the whole subject before JEE.' },
  { slug: 'mathematics-complete', subject: 'mathematics', classLevel: 'both', chapters: 'ALL', price: 999, mrp: 1499, sortOrder: 8,
    title: 'Complete Mathematics: Class 11 and 12',
    summary: 'Every Mathematics chapter in one pack, in book order. Revise the whole subject before JEE.' },
  { slug: 'chemistry-toughest-chapters', subject: 'chemistry', classLevel: 'both', chapters: 'HARD', discount: 0.3, sortOrder: 10,
    title: 'Toughest Chemistry Chapters Pack',
    summary: 'The chapters students find hardest, together at a lower price.' },
  { slug: 'mathematics-toughest-chapters', subject: 'mathematics', classLevel: 'both', chapters: 'HARD', discount: 0.3, sortOrder: 11,
    title: 'Toughest Mathematics Chapters Pack',
    summary: 'The chapters students find hardest, together at a lower price.' },
  { slug: 'jee-toughest-chapters', subject: 'mixed', classLevel: 'both', chapters: 'HARD_ALL', minSubjects: 2, discount: 0.3, sortOrder: 12,
    title: 'Toughest JEE Chapters Pack',
    summary: 'The hardest chapters from every subject, together at a lower price.' },
  { slug: 'jee-complete-pcm', subject: 'mixed', classLevel: 'both', chapters: 'EVERYTHING', minSubjects: 3, price: 2499, mrp: 4497, sortOrder: 9,
    title: 'Complete JEE: Physics, Chemistry and Mathematics',
    summary: 'Every chapter of all three subjects in one pack. The full syllabus, revised in time.' },
]

// Real discounts only: no end date is invented. Add validUntil in the admin if you want one.
const COUPONS = [
  { code: 'WELCOME10', description: '10% off your first order', type: 'percent', value: 10, maxDiscountPaise: 10000, minOrderPaise: 0, perUserLimit: 1 },
  { code: 'JEE15', description: '15% off orders of ₹499 or more', type: 'percent', value: 15, maxDiscountPaise: 25000, minOrderPaise: 49900, perUserLimit: 1 },
]
// ---------------------------------------------------------------------------------------------

const norm = (title) => String(title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const rupees = (paise) => `₹${paise / 100}`
const endIn9 = (value) => Math.max(9, Math.round(value / 10) * 10 - 1)

function matchChapter(subject, title) {
  const list = CHAPTERS[subject]
  if (!list) return null
  const t = norm(title)
  const index = list.findIndex((c) => c.m.test(t))
  return index === -1 ? null : { index, ...list[index] }
}

assertEnv()
await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })
console.log(APPLY ? '*** APPLY MODE: changes will be written ***\n' : 'DRY RUN: nothing will be written (add --apply to make the changes)\n')

const backup = { at: new Date().toISOString(), notes: [], bundlesCreated: [], bundlesExtended: [], couponsCreated: [] }

// ---- 1 + 2: notes ---------------------------------------------------------------------------------
const notes = await Product.find({ kind: 'note', status: { $ne: 'archived' } }).sort({ createdAt: 1 })
const orderCounts = new Map()
for (const n of notes) orderCounts.set(String(n._id), await Order.countDocuments({ product: n._id }))

const seen = new Map() // "subject:index" -> primary note
const plan = [] // { note, chapter, sortOrder, set, primary }
const unmatched = []
for (const note of notes) {
  const hit = matchChapter(note.subject, note.title) ?? matchChapter(note.subject, note.chapter)
  if (!hit) {
    unmatched.push(note)
    plan.push({ note, set: { sortOrder: 9000 + plan.length }, chapter: null, primary: false })
    continue
  }
  const key = `${note.subject}:${hit.index}`
  const first = seen.get(key)
  // If two notes cover the same chapter, the one with orders (else the older one) is the primary.
  let primary = !first
  if (first && (orderCounts.get(String(note._id)) ?? 0) > (orderCounts.get(String(first.note._id)) ?? 0)) {
    first.primary = false
    primary = true
  }
  const duplicates = plan.filter((p) => p.key === key).length
  const sortOrder = SUBJECT_BASE[note.subject] + hit.index * STEP + (primary ? 0 : duplicates)
  const set = { sortOrder, chapter: hit.name }
  if (hit.hard) {
    set.difficulty = 'Hard'
    set.pricePaise = HARD_PRICE * 100
    set.mrpPaise = HARD_MRP * 100
  }
  const entry = { note, key, hit, set, primary }
  plan.push(entry)
  if (primary) seen.set(key, entry)
}

console.log('NOTES (book order)')
const rows = [...plan].sort((a, b) => a.set.sortOrder - b.set.sortOrder)
for (const { note, set, hit, primary } of rows) {
  const price = set.pricePaise ?? note.pricePaise
  const mrp = set.mrpPaise ?? note.mrpPaise
  const changed = []
  if (note.sortOrder !== set.sortOrder) changed.push(`order ${note.sortOrder}->${set.sortOrder}`)
  if (set.chapter && note.chapter !== set.chapter) changed.push('chapter')
  if (set.difficulty && note.difficulty !== set.difficulty) changed.push(`difficulty ${note.difficulty ?? '-'}->Hard`)
  if (set.pricePaise != null && (note.pricePaise !== set.pricePaise || note.mrpPaise !== set.mrpPaise)) changed.push(`price ${rupees(note.pricePaise)}/${note.mrpPaise != null ? rupees(note.mrpPaise) : '-'}->${rupees(price)}/${rupees(mrp)}`)
  console.log(
    `  ${String(set.sortOrder).padStart(4)}  ${(hit?.name ?? '(no match)').padEnd(38)} ${note.slug.padEnd(40)} ${rupees(price)}/${mrp != null ? rupees(mrp) : '-'}${primary ? '' : '  [DUPLICATE of the same chapter, kept out of bundles]'}${changed.length ? '   <- ' + changed.join(', ') : ''}`,
  )
}
if (unmatched.length) console.log(`\n  No chapter matched (sorted last, left as they are): ${unmatched.map((n) => `"${n.title}"`).join(', ')}`)

if (APPLY) {
  for (const { note, set } of plan) {
    const differs = Object.entries(set).some(([k, v]) => note[k] !== v)
    if (!differs) continue
    backup.notes.push({ id: String(note._id), slug: note.slug, before: Object.fromEntries(Object.keys(set).map((k) => [k, note[k] ?? null])) })
    await Product.updateOne({ _id: note._id }, { $set: set })
  }
}

// ---- 3: bundles -----------------------------------------------------------------------------------
console.log('\nBUNDLES')
const primaries = plan.filter((p) => p.primary && p.note.status === 'published')
const priceOf = (p) => p.set.pricePaise ?? p.note.pricePaise
for (const spec of BUNDLES) {
  let picked
  if (Array.isArray(spec.chapters)) picked = primaries.filter((p) => p.note.subject === spec.subject && spec.chapters.includes(p.hit.name))
  else if (spec.chapters === 'HARD') picked = primaries.filter((p) => p.note.subject === spec.subject && p.hit.hard)
  else if (spec.chapters === 'ALL') picked = primaries.filter((p) => p.note.subject === spec.subject)
  else if (spec.chapters === 'HARD_ALL') picked = primaries.filter((p) => p.hit.hard)
  else picked = primaries
  picked.sort((a, b) => a.set.sortOrder - b.set.sortOrder)

  const subjects = new Set(picked.map((p) => p.note.subject))
  if (picked.length < 2 || subjects.size < (spec.minSubjects ?? 1)) {
    console.log(`  - ${spec.slug.padEnd(32)} skipped (${picked.length} matching published ${picked.length === 1 ? 'note' : 'notes'}; ${spec.minSubjects ? `needs ${spec.minSubjects} subjects` : 'needs 2'})`)
    continue
  }
  const sum = picked.reduce((total, p) => total + priceOf(p), 0)
  // `sum` is in paise; the price is rounded to a rupee amount ending in 9.
  const price = spec.price != null ? spec.price * 100 : endIn9((sum * (1 - spec.discount)) / 100) * 100
  const mrp = spec.mrp != null ? spec.mrp * 100 : undefined
  const ids = picked.map((p) => p.note._id)
  const existing = await Product.findOne({ slug: spec.slug })

  if (existing) {
    const have = new Set(existing.bundleItems.map(String))
    const added = ids.filter((id) => !have.has(String(id)))
    // Only bundles with a fixed offer are repriced; the rest keep whatever price you set.
    const repriced = spec.price != null && (existing.pricePaise !== price || existing.mrpPaise !== mrp)
    console.log(
      `  = ${spec.slug.padEnd(32)} exists (${existing.bundleItems.length} notes, ${rupees(existing.pricePaise)})` +
        `${repriced ? `, price -> ${rupees(price)} (worth ${rupees(mrp)})` : ''}` +
        `${added.length ? `, would add ${added.length} new ${added.length === 1 ? 'note' : 'notes'}` : ''}${!repriced && !added.length ? ', up to date' : ''}`,
    )
    if (APPLY && (added.length || repriced)) {
      const $set = {}
      if (added.length) $set.bundleItems = [...existing.bundleItems, ...added]
      if (repriced) Object.assign($set, { pricePaise: price, ...(mrp != null ? { mrpPaise: mrp } : {}) })
      await Product.updateOne({ _id: existing._id }, { $set })
      if (added.length) await extendBundleBuyers(existing._id, added)
      backup.bundlesExtended.push({ slug: spec.slug, added: added.map(String), before: repriced ? { pricePaise: existing.pricePaise, mrpPaise: existing.mrpPaise ?? null } : undefined })
    }
    continue
  }
  const save = Math.round((1 - price / sum) * 100)
  console.log(`  + ${spec.slug.padEnd(32)} ${String(picked.length).padStart(2)} notes  ${rupees(sum)} separately -> ${rupees(price)}  (save ${save}%)  "${spec.title}"`)
  if (APPLY) {
    await Product.create({
      slug: spec.slug,
      title: spec.title,
      summary: spec.summary,
      description: `${spec.summary}\n\nOne payment, and every note in the pack is yours to read in the JEEdge reader.`,
      kind: 'bundle',
      type: 'bundle',
      subject: spec.subject,
      classLevel: spec.classLevel,
      pricePaise: price,
      ...(mrp != null ? { mrpPaise: mrp } : {}),
      premiumEligible: false,
      status: 'published',
      publishedAt: new Date(),
      sortOrder: spec.sortOrder,
      bundleItems: ids,
      contents: picked.map((p) => p.hit.name).slice(0, 60),
      includes: ['Read online in the JEEdge reader, on phone or laptop', 'Chapters added to this pack later unlock automatically'],
    })
    backup.bundlesCreated.push(spec.slug)
  }
}

// ---- Premium plans: there is no subscription, so they are taken off sale (existing holders keep access) -------
console.log('\nPREMIUM PLANS')
const plans = await Product.find({ kind: 'plan', status: 'published' })
if (!plans.length) console.log('  none on sale')
for (const plan of plans) {
  console.log(`  - ${plan.slug} (${rupees(plan.pricePaise)}) taken off sale`)
  if (APPLY) {
    await Product.updateOne({ _id: plan._id }, { $set: { status: 'draft' } })
    backup.plansUnpublished = [...(backup.plansUnpublished ?? []), plan.slug]
  }
}

// ---- 4: coupons -----------------------------------------------------------------------------------
console.log('\nCOUPONS')
for (const coupon of COUPONS) {
  const exists = await Coupon.exists({ code: coupon.code })
  console.log(`  ${exists ? '=' : '+'} ${coupon.code.padEnd(10)} ${coupon.description}${exists ? ' (already exists)' : ''}`)
  if (APPLY && !exists) {
    await Coupon.create({ ...coupon, active: true })
    backup.couponsCreated.push(coupon.code)
  }
}

if (APPLY) {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backups')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `catalog-${backup.at.replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(file, JSON.stringify(backup, null, 2))
  console.log(`\nDone. Old values saved to ${file}`)
} else {
  console.log('\nNothing was written. Run again with --apply to make these changes.')
}
await mongoose.disconnect()
