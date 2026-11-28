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
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { SystemStatus } from '../types'

interface TermsFooterProps {
  /**
   * `links` renders the two documents as standalone navigation entries, for
   * surfaces such as the sign-in dialog. Unlike the consent sentences it does
   * not depend on the operator having published the documents yet.
   */
  variant?: 'sign-in' | 'sign-up' | 'links'
  className?: string
  status?: SystemStatus | null
}

const LEGAL_LINK_CLASS_NAME =
  'text-muted-foreground hover:text-primary underline underline-offset-4'

export function TermsFooter({
  variant = 'sign-in',
  className,
  status,
}: TermsFooterProps) {
  const { t } = useTranslation()

  const agreementLink = {
    label: 'User Agreement',
    href: '/user-agreement',
  }
  const privacyLink = {
    label: 'Privacy Policy',
    href: '/privacy-policy',
  }

  if (variant === 'links') {
    return (
      <p
        className={cn(
          'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs',
          className
        )}
      >
        <a
          href={agreementLink.href}
          target='_blank'
          rel='noopener noreferrer'
          className={LEGAL_LINK_CLASS_NAME}
        >
          {t(agreementLink.label)}
        </a>
        <span aria-hidden='true' className='text-muted-foreground/60'>
          ·
        </span>
        <a
          href={privacyLink.href}
          target='_blank'
          rel='noopener noreferrer'
          className={LEGAL_LINK_CLASS_NAME}
        >
          {t(privacyLink.label)}
        </a>
      </p>
    )
  }

  const text =
    variant === 'sign-in'
      ? 'By clicking sign in, you agree to our'
      : 'By creating an account, you agree to our'

  const hasUserAgreement = Boolean(status?.user_agreement_enabled)
  const hasPrivacyPolicy = Boolean(status?.privacy_policy_enabled)

  if (!hasUserAgreement && !hasPrivacyPolicy) {
    return null
  }

  const [firstLink, secondLink] = [
    hasUserAgreement ? agreementLink : null,
    hasPrivacyPolicy ? privacyLink : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>

  return (
    <p className={cn('text-muted-foreground text-center text-xs', className)}>
      {t(text)}{' '}
      {firstLink && (
        <a
          href={firstLink.href}
          className='hover:text-primary underline underline-offset-4'
        >
          {t(firstLink.label)}
        </a>
      )}
      {secondLink && (
        <>
          {' '}
          {t('and')}{' '}
          <a
            href={secondLink.href}
            className='hover:text-primary underline underline-offset-4'
          >
            {t(secondLink.label)}
          </a>
        </>
      )}
      .
    </p>
  )
}
