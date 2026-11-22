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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Header actions of the storefront: a live status pill plus the top-up entry.
 * The pill only appears once `/api/status` has answered, so it reflects a
 * reachable backend instead of a hard-coded claim.
 */
export function ShowcaseNavActions() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const isAuthenticated = !!useAuthStore((state) => state.auth.user)

  return (
    <>
      {status && (
        <span className='mr-2 hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs whitespace-nowrap text-emerald-700 xl:inline-flex dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'>
          <span className='size-1.5 rounded-full bg-emerald-500' />
          {t('API operational')}
        </span>
      )}
      <Link
        to={isAuthenticated ? '/wallet' : '/sign-in'}
        search={isAuthenticated ? undefined : { redirect: '/wallet' }}
        className='mr-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 text-xs font-semibold whitespace-nowrap text-white transition hover:from-violet-700 hover:to-blue-700'
      >
        <svg
          aria-hidden='true'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.9'
          className='size-3.5'
        >
          <rect x='3' y='7' width='18' height='12' rx='3' />
          <path d='M3 10.5h18' />
          <circle
            cx='16.6'
            cy='14.6'
            r='1.5'
            fill='currentColor'
            stroke='none'
          />
        </svg>
        {t('Top up')}
      </Link>
    </>
  )
}
