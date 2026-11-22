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

interface HeroOrbitProps {
  className?: string
}

/**
 * Three crossing ellipses behind the hero copy. Values are locked by the
 * product spec: any change to the geometry must keep the ring covering the
 * copy block without touching the model panel on the right.
 */
export function HeroOrbit({ className }: HeroOrbitProps) {
  return (
    <svg
      aria-hidden='true'
      className={cn('showcase-orbit-spin', className)}
      fill='none'
      viewBox='0 0 600 600'
    >
      <ellipse
        cx='300'
        cy='300'
        rx='250'
        ry='218'
        stroke='rgba(124,58,237,.26)'
        strokeDasharray='7 11'
        strokeWidth='1.3'
      />
      <ellipse
        cx='300'
        cy='300'
        rx='238'
        ry='182'
        stroke='rgba(31,111,235,.40)'
        strokeWidth='1.3'
      />
      <ellipse
        cx='300'
        cy='300'
        rx='182'
        ry='238'
        stroke='rgba(31,111,235,.28)'
        strokeWidth='1.3'
        transform='rotate(-18 300 300)'
      />
      <circle cx='300' cy='82' r='4' fill='#1f6feb' opacity='.95' />
      <circle cx='92' cy='356' r='3' fill='#4f8cf7' opacity='.8' />
      <circle cx='492' cy='404' r='2.8' fill='#7c3aed' opacity='.7' />
    </svg>
  )
}
