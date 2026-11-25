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
import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { useStatus } from '@/hooks/use-status'
import { useAuthStore } from '@/stores/auth-store'
import { useSignInDialogStore } from '@/stores/sign-in-dialog-store'

import { UserAuthForm } from '../sign-in/components/user-auth-form'
import { TermsFooter } from './terms-footer'

/**
 * Sign-in surface for public pages: the visitor stays on the page they were
 * reading instead of being sent to the standalone `/sign-in` route. The route
 * remains reachable for direct links, expired sessions and OAuth callbacks.
 */
export function SignInDialog() {
  const { t } = useTranslation()
  const isOpen = useSignInDialogStore((state) => state.isOpen)
  const redirectTo = useSignInDialogStore((state) => state.redirectTo)
  const closeSignIn = useSignInDialogStore((state) => state.closeSignIn)
  const user = useAuthStore((state) => state.auth.user)
  const { status } = useStatus()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const openedAtPathname = useRef<string | null>(null)

  // The sign-up page opens this dialog for its own "Sign in" entry, so the
  // register prompt would point back to the page already rendered behind it.
  const canRegister =
    pathname !== '/sign-up' &&
    !status?.self_use_mode_enabled &&
    status?.register_enabled !== false

  // Signing in from the dialog navigates in place, so the dialog has to close
  // itself once the new session is in the store.
  useEffect(() => {
    if (user) closeSignIn()
  }, [user, closeSignIn])

  // Links inside the form (password recovery, OAuth, two-step verification)
  // leave the current page. Closing on a location change keeps the dialog from
  // reappearing over whatever page the visitor lands on next.
  useEffect(() => {
    if (!isOpen) {
      openedAtPathname.current = null
      return
    }
    if (openedAtPathname.current === null) {
      openedAtPathname.current = pathname
      return
    }
    if (openedAtPathname.current !== pathname) closeSignIn()
  }, [isOpen, pathname, closeSignIn])

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeSignIn()
      }}
      title={t('Sign in')}
      description={
        canRegister ? (
          <>
            {t("Don't have an account?")}{' '}
            <Link
              to='/sign-up'
              className='hover:text-primary font-medium underline underline-offset-4'
            >
              {t('Sign up')}
            </Link>
            .
          </>
        ) : undefined
      }
      contentClassName='sm:max-w-md'
      contentHeight='auto'
      bodyClassName='space-y-4'
    >
      <UserAuthForm redirectTo={redirectTo} />
      <TermsFooter variant='links' className='pt-1' />
    </Dialog>
  )
}
