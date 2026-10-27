// Sample data for the dashboard demo. Tests attempted in the app are saved locally (see STORAGE_KEYS).
export const ANALYTICS_NOTE =
  'Sample data shown for demonstration. Tests you attempt in this browser are saved on this device.'

export const SAMPLE_MAX_SCORE = 120

// bySubject values: [correct, wrong, unattempted] out of 10 questions per subject.
export const TEST_HISTORY = [
  {
    id: 'a1',
    name: 'Mixed Paper 1',
    date: '2026-09-06',
    score: 48,
    timeMinutes: 60,
    bySubject: { physics: [5, 3, 2], chemistry: [5, 2, 3], mathematics: [4, 3, 3] },
  },
  {
    id: 'a2',
    name: 'Mixed Paper 2',
    date: '2026-09-13',
    score: 57,
    timeMinutes: 58,
    bySubject: { physics: [6, 3, 1], chemistry: [5, 2, 3], mathematics: [5, 2, 3] },
  },
  {
    id: 'a3',
    name: 'Mixed Paper 3',
    date: '2026-09-20',
    score: 62,
    timeMinutes: 59,
    bySubject: { physics: [6, 2, 2], chemistry: [6, 2, 2], mathematics: [5, 2, 3] },
  },
  {
    id: 'a4',
    name: 'Mixed Paper 4',
    date: '2026-09-27',
    score: 51,
    timeMinutes: 60,
    bySubject: { physics: [5, 4, 1], chemistry: [5, 2, 3], mathematics: [5, 3, 2] },
  },
  {
    id: 'a5',
    name: 'Mixed Paper 5',
    date: '2026-10-04',
    score: 70,
    timeMinutes: 57,
    bySubject: { physics: [7, 2, 1], chemistry: [6, 2, 2], mathematics: [6, 2, 2] },
  },
  {
    id: 'a6',
    name: 'Mixed Paper 6',
    date: '2026-10-11',
    score: 79,
    timeMinutes: 56,
    bySubject: { physics: [8, 1, 1], chemistry: [7, 2, 1], mathematics: [6, 2, 2] },
  },
]

export const TOPIC_STATS = [
  { subject: 'physics', chapter: 'Rotational Motion', attempted: 13, correct: 5 },
  { subject: 'physics', chapter: 'Thermodynamics', attempted: 11, correct: 5 },
  { subject: 'physics', chapter: 'Electrostatics', attempted: 14, correct: 8 },
  { subject: 'physics', chapter: 'Current Electricity', attempted: 10, correct: 7 },
  { subject: 'physics', chapter: 'Kinematics', attempted: 12, correct: 10 },
  { subject: 'chemistry', chapter: 'Coordination Compounds', attempted: 9, correct: 3 },
  { subject: 'chemistry', chapter: 'Chemical Equilibrium', attempted: 12, correct: 6 },
  { subject: 'chemistry', chapter: 'Hydrocarbons', attempted: 11, correct: 6 },
  { subject: 'chemistry', chapter: 'Chemical Kinetics', attempted: 10, correct: 7 },
  { subject: 'chemistry', chapter: 'Some Basic Concepts of Chemistry', attempted: 12, correct: 10 },
  { subject: 'mathematics', chapter: 'Integral Calculus', attempted: 15, correct: 6 },
  { subject: 'mathematics', chapter: 'Vector Algebra', attempted: 9, correct: 5 },
  { subject: 'mathematics', chapter: 'Binomial Theorem', attempted: 8, correct: 5 },
  { subject: 'mathematics', chapter: 'Probability', attempted: 11, correct: 7 },
  { subject: 'mathematics', chapter: 'Quadratic Equations', attempted: 10, correct: 9 },
]

export const REVISION_RECOMMENDATIONS = [
  {
    id: 'r1',
    title: 'Rotational Motion: torque and rolling',
    reason: 'Lowest accuracy among your attempted chapters.',
    resourceId: 'phy-mechanics-formulas',
    minutes: 25,
    priority: 'High',
  },
  {
    id: 'r2',
    title: 'Coordination Compounds: crystal field and spin',
    reason: 'Spin and magnetism questions were missed repeatedly.',
    resourceId: 'chem-coordination-notes',
    minutes: 30,
    priority: 'High',
  },
  {
    id: 'r3',
    title: 'Definite integrals: property-based evaluation',
    reason: 'Most attempts in this chapter ended in a wrong option.',
    resourceId: 'math-integration-pyq',
    minutes: 40,
    priority: 'High',
  },
  {
    id: 'r4',
    title: 'Chemical Equilibrium: Kp, Kc and shifts',
    reason: 'Accuracy sits at about half, so a second pass will pay off.',
    resourceId: 'chem-equilibrium-pyq',
    minutes: 30,
    priority: 'Medium',
  },
]

export const WEEKLY_PLAN = [
  { day: 'Mon', focus: 'Physics', tasks: [{ label: 'Rotational Motion formulas', minutes: 25, resourceId: 'phy-mechanics-formulas' }, { label: 'Ten Physics practice questions', minutes: 25 }] },
  { day: 'Tue', focus: 'Chemistry', tasks: [{ label: 'Coordination Compounds notes', minutes: 30, resourceId: 'chem-coordination-notes' }, { label: 'Chemistry practice set', minutes: 20 }] },
  { day: 'Wed', focus: 'Mathematics', tasks: [{ label: 'Definite integration PYQs', minutes: 40, resourceId: 'math-integration-pyq' }] },
  { day: 'Thu', focus: 'Chemistry', tasks: [{ label: 'Chemical Equilibrium PYQs', minutes: 30, resourceId: 'chem-equilibrium-pyq' }, { label: 'Review wrong answers', minutes: 15 }] },
  { day: 'Fri', focus: 'Review', tasks: [{ label: 'Mistake notebook pass', minutes: 30 }] },
  { day: 'Sat', focus: 'Mock', tasks: [{ label: 'Full Mock 1: Mixed Paper', minutes: 60, resourceId: 'mock-full-1' }] },
  { day: 'Sun', focus: 'Rest and recap', tasks: [{ label: 'Review the mock, then rest', minutes: 30 }] },
]

// yourAnswer is the zero-based index of the option chosen in the sample attempt.
export const SAMPLE_MISTAKES = [
  {
    id: 'mk1',
    questionId: 'p04',
    yourAnswer: 0,
    tag: 'Concept gap',
    date: '2026-10-11',
    note: 'Ignored the rotational kinetic energy while rolling.',
    status: 'open',
  },
  {
    id: 'mk2',
    questionId: 'c09',
    yourAnswer: 2,
    tag: 'Concept gap',
    date: '2026-10-11',
    note: 'Forgot that CN⁻ is a strong-field ligand.',
    status: 'open',
  },
  {
    id: 'mk3',
    questionId: 'm08',
    yourAnswer: 0,
    tag: 'Misread question',
    date: '2026-10-04',
    note: 'Evaluated only one of the two integrals and stopped early.',
    status: 'revised',
  },
  {
    id: 'mk4',
    questionId: 'p06',
    yourAnswer: 0,
    tag: 'Calculation slip',
    date: '2026-10-04',
    note: 'Used Cv instead of Cp for constant pressure.',
    status: 'revised',
  },
  {
    id: 'mk5',
    questionId: 'c05',
    yourAnswer: 0,
    tag: 'Calculation slip',
    date: '2026-09-27',
    note: 'Sign of Δn was wrong.',
    status: 'open',
  },
]