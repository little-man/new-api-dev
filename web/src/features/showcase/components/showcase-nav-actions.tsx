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

import { useAuthStore } from '@/stores/auth-store'
import { useSignInDialogStore } from '@/stores/sign-in-dialog-store'

const TOP_UP_CLASS_NAME =
  'mr-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 text-xs font-semibold whitespace-nowrap text-white transition hover:from-violet-700 hover:to-blue-700'

/**
 * Header actions of the storefront. The top-up entry doubles as the sign-in
 * entry for visitors without an account: it opens the in-page sign-in dialog
 * and lands on the wallet once the session exists.
 */
export function ShowcaseNavActions() {
  const { t } = useTranslation()
  const isAuthenticated = !!useAuthStore((state) => state.auth.user)
  const openSignIn = useSignInDialogStore((state) => state.openSignIn)

  const content = (
    <>
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
    </>
  )

  if (isAuthenticated) {
    return (
      <Link to='/wallet' className={TOP_UP_CLASS_NAME}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type='button'
      onClick={() => openSignIn('/wallet')}
      className={TOP_UP_CLASS_NAME}
    >
      {content}
    </button>
  )
}
