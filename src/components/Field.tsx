import { useEffect, useRef, type ReactNode } from 'react'
import { countChars } from '../db'
import { fmtNum } from '../ui'

interface Base {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: ReactNode
  id?: string
  className?: string
}

export function TextField({ label, value, onChange, placeholder, hint, id, className, big }: Base & { big?: boolean }) {
  return (
    <label className={'field ' + (className ?? '')}>
      <span className="field-label">{label}</span>
      <input id={id} className={big ? 'input-big' : ''} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

/** 内容に合わせて高さが伸びるテキストエリア */
export function AreaField({ label, value, onChange, placeholder, hint, id, className, rows = 1, count }: Base & { rows?: number; count?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 2 + 'px'
  }, [value])
  return (
    <label className={'field ' + (className ?? '')}>
      <span className="field-label">
        {label}
        {count && <span className="field-count">{fmtNum(countChars(value))} 字</span>}
      </span>
      <textarea id={id} ref={ref} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function AutoArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 2 + 'px'
  }, [props.value])
  return <textarea ref={ref} rows={1} {...props} />
}
