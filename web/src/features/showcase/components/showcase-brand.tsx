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

/**
 * Brand of the public storefront. It is deliberately independent from the
 * admin-configured site name: the authenticated console keeps using the
 * operator's own branding.
 */
export const SHOWCASE_BRAND_NAME = 'TokenBerth'

export function ShowcaseBrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden='true'
      className={cn(
        'flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600',
        className
      )}
    >
      <svg
        viewBox='0 0 24 24'
        fill='none'
        stroke='#fff'
        strokeLinecap='round'
        className='size-4'
      >
        <path d='M7.6 8.4v4.4a4.4 4.4 0 0 0 8.8 0v-4.4' strokeWidth='2.2' />
        <circle cx='12' cy='5.2' r='2.1' fill='#fff' stroke='none' />
      </svg>
    </span>
  )
}
