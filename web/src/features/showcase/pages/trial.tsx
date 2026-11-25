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
import { MessageSquareTextIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Playground } from '@/features/playground'
import { useAuthStore } from '@/stores/auth-store'
import { useSignInDialogStore } from '@/stores/sign-in-dialog-store'

import { ShowcaseShell } from '../components/showcase-shell'

interface ShowcaseTrialProps {
  initialModel?: string
}

export function ShowcaseTrial(props: ShowcaseTrialProps) {
  const { t } = useTranslation()
  const isAuthenticated = !!useAuthStore((state) => state.auth.user)
  const openSignIn = useSignInDialogStore((state) => state.openSignIn)
  const signInRedirect = props.initialModel
    ? `/trial?model=${encodeURIComponent(props.initialModel)}`
    : '/trial'

  return (
    <ShowcaseShell>
      <div className='mx-auto w-full max-w-7xl px-4 pt-6 pb-12 md:px-6'>
        <div className='mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-[12px] text-slate-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-slate-300'>
          <span>
            {isAuthenticated
              ? t(
                  'Requests go to real models through your account. Usage is billed according to the selected model and group.'
                )
              : t(
                  'Sign in to call real models. This page does not return simulated replies.'
                )}
          </span>
          {isAuthenticated && (
            <Link
              to='/console-preview'
              search={{ tab: 'logs' }}
              className='font-semibold whitespace-nowrap text-blue-700 hover:underline dark:text-blue-400'
            >
              {t('View account usage')} →
            </Link>
          )}
        </div>

        {isAuthenticated ? (
          <section
            aria-label={t('Online Trial')}
            className='flex h-[min(780px,calc(100svh-10rem))] min-h-[620px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
          >
            <Playground initialModel={props.initialModel} />
          </section>
        ) : (
          <section className='flex min-h-[560px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900'>
            <div className='mb-5 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'>
              <MessageSquareTextIcon className='size-6' aria-hidden='true' />
            </div>
            <h1 className='text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100'>
              {t('Sign in to start a real model conversation')}
            </h1>
            <p className='mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400'>
              {t(
                'Online Trial uses the same available models, streaming responses, and conversation controls as the Playground. Requests use your account balance.'
              )}
            </p>
            <Button
              className='mt-6'
              size='lg'
              onClick={() => openSignIn(signInRedirect)}
            >
              {t('Sign in to continue')}
            </Button>
          </section>
        )}
      </div>
    </ShowcaseShell>
  )
}
