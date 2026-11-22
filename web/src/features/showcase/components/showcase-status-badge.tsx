/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { cn } from '@/lib/utils'

export function StatusBadge({
  tone,
  label,
}: {
  tone: 'ok' | 'off' | 'warn'
  label: string
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap',
        tone === 'ok' &&
          'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        tone === 'warn' &&
          'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        tone === 'off' &&
          'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
      )}
    >
      {label}
    </span>
  )
}
