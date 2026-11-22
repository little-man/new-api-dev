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

import { SHOWCASE_ROUTES } from '../lib/showcase-nav'
import { ShowcaseBrandMark, SHOWCASE_BRAND_NAME } from './showcase-brand'

type FooterItem = {
  label: string
  href: string
  external?: boolean
}

function FooterColumn({
  title,
  items,
}: {
  title: string
  items: FooterItem[]
}) {
  if (items.length === 0) return null
  return (
    <div>
      <b className='mb-2 block text-[13px] font-semibold text-slate-700 dark:text-slate-200'>
        {title}
      </b>
      <ul className='space-y-1'>
        {items.map((item) => (
          <li key={item.label}>
            {item.external ? (
              <a
                href={item.href}
                target='_blank'
                rel='noopener noreferrer'
                className='text-[12.5px] text-slate-500 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400'
              >
                {item.label}
              </a>
            ) : (
              <Link
                to={item.href}
                className='text-[12.5px] text-slate-500 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400'
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Storefront footer. Every entry resolves to a real destination: legal links
 * follow the admin's publishing switches, and no registration or licence
 * number is invented for the fine print.
 */
export function ShowcaseFooter() {
  const { t } = useTranslation()
  const { status } = useStatus()

  const docsLink = status?.docs_link as string | undefined

  const product: FooterItem[] = [
    { label: t('Model Marketplace'), href: SHOWCASE_ROUTES.market },
    { label: t('Online Trial'), href: SHOWCASE_ROUTES.trial },
    { label: t('Enterprise'), href: SHOWCASE_ROUTES.enterprise },
    { label: t('Console'), href: SHOWCASE_ROUTES.console },
  ]

  const support: FooterItem[] = [
    ...(docsLink
      ? [{ label: t('Integration docs'), href: docsLink, external: true }]
      : []),
    { label: t('About and status'), href: '/about' },
  ]

  const legal: FooterItem[] = [
    ...(status?.user_agreement_enabled
      ? [{ label: t('User Agreement'), href: '/user-agreement' }]
      : []),
    ...(status?.privacy_policy_enabled
      ? [{ label: t('Privacy Policy'), href: '/privacy-policy' }]
      : []),
  ]

  return (
    <footer className='mt-14 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40'>
      <div className='mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-4 gap-y-6 px-4 py-8 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-6'>
        <div className='col-span-2 md:col-span-1'>
          <div className='flex items-center gap-2'>
            <ShowcaseBrandMark />
            <span className='text-base font-bold text-slate-900 dark:text-slate-100'>
              {SHOWCASE_BRAND_NAME}
            </span>
          </div>
          <p className='mt-3 max-w-[24em] text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400'>
            {t('One key for every mainstream model.')}
          </p>
        </div>
        <FooterColumn title={t('Product')} items={product} />
        <FooterColumn title={t('Support')} items={support} />
        <FooterColumn title={t('Compliance')} items={legal} />
      </div>
      <div className='mx-auto w-full max-w-7xl border-t border-slate-100 px-4 py-4 text-[11.5px] text-slate-400 md:px-6 dark:border-slate-800/70'>
        © {new Date().getFullYear()} {SHOWCASE_BRAND_NAME} ·{' '}
        {t('One key for every mainstream model.')}
      </div>
    </footer>
  )
}
