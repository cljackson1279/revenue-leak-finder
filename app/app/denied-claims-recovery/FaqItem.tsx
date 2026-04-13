'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-zinc-200 last:border-0">
      <button
        className="flex w-full items-start justify-between gap-4 py-5 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-base font-medium text-zinc-900">{q}</span>
        {open
          ? <ChevronUp className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
          : <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />}
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-zinc-600">{a}</p>}
    </div>
  )
}
