import { BookOpen, Sigma, FileText, Timer } from 'lucide-react'

export const RESOURCE_TYPES = {
  notes: { label: 'Short notes', icon: BookOpen },
  formula: { label: 'Formula sheet', icon: Sigma },
  pyq: { label: 'Chapter PYQs', icon: FileText },
  mock: { label: 'Mock test', icon: Timer },
}

export const TYPE_OPTIONS = Object.entries(RESOURCE_TYPES).map(([id, meta]) => ({
  id,
  label: meta.label,
}))