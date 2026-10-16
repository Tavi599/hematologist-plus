import { useEffect, useRef } from 'react'

import { clockOfHour, inSheetOrder, SHEET_HOURS } from '../../lib/row-plan'
import classes from './HourStrip.module.css'

/** Every sixth hour of the sheet starts a group, as on the printed blank. */
const GROUP_EVERY = 6

/**
 * The hours of the sheet as a strip of cells, in the sheet's own order. With `multiple` each cell
 * is switched on and off by a click — three cells are three times a day. Without it the strip holds
 * one hour, set by a click or by dragging along it.
 */
export function HourStrip({
  hours,
  pinned,
  multiple,
  disabled = false,
  label,
  onChange,
}: {
  /** The hours marked: the physician's, or the ones the schedule gives. */
  hours: number[]
  /** The physician set them; otherwise they are the regimen's and shown lighter. */
  pinned: boolean
  multiple: boolean
  disabled?: boolean
  label: string
  onChange: (hours: number[]) => void
}) {
  const dragging = useRef(false)
  useEffect(() => {
    const stop = () => {
      dragging.current = false
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  const marked = new Set(hours)
  const pick = (hour: number) => {
    if (!multiple) {
      if (!(pinned && marked.size === 1 && marked.has(hour))) onChange([hour])
      return
    }
    // The last hour is not taken away: a drug that is on is given at least once.
    if (marked.has(hour)) {
      if (marked.size > 1) onChange(inSheetOrder(hours.filter((entry) => entry !== hour)))
      else if (!pinned) onChange([hour])
    } else {
      onChange(inSheetOrder([...hours, hour]))
    }
  }

  return (
    <div className={classes.strip} role="group" aria-label={label}>
      {SHEET_HOURS.map((hour, index) => (
        <button
          key={hour}
          type="button"
          className={classes.hour}
          disabled={disabled}
          data-on={marked.has(hour) || undefined}
          data-pinned={pinned || undefined}
          data-group={(index > 0 && index % GROUP_EVERY === 0) || undefined}
          aria-pressed={marked.has(hour)}
          aria-label={clockOfHour(hour)}
          title={clockOfHour(hour)}
          onPointerDown={(event) => {
            if (multiple || disabled) return
            // A finger keeps the pointer on the cell it touched; let the strip see it move.
            event.currentTarget.releasePointerCapture?.(event.pointerId)
            dragging.current = true
            pick(hour)
          }}
          onPointerEnter={() => {
            if (!multiple && dragging.current && !disabled) pick(hour)
          }}
          onClick={() => pick(hour)}
        >
          {hour === 0 ? 24 : hour}
        </button>
      ))}
    </div>
  )
}
