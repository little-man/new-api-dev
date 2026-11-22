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
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import type { TopNavLink } from '@/components/layout/types'
import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'

import { SHOWCASE_NAV_LINKS } from '../lib/showcase-nav'
import { ShowcaseBrandMark, SHOWCASE_BRAND_NAME } from './showcase-brand'
import { ShowcaseFooter } from './showcase-footer'
import { ShowcaseNavActions } from './showcase-nav-actions'

interface ShowcaseShellProps {
  children: React.ReactNode
  className?: string
}

/**
 * Shared chrome for every public showcase page. The header keeps the global
 * language switcher, theme switch and auth state, but pins the TokenBerth
 * brand and the showcase navigation instead of the admin-configured ones.
 * Below the desktop breakpoint the navigation becomes a second, horizontally
 * scrollable row, matching the storefront prototype.
 */
export function ShowcaseShell({ children, className }: ShowcaseShellProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const docsLink = status?.docs_link as string | undefined
  // The docs entry only exists when the operator published a documentation
  // site; a placeholder link would be a dead end for visitors.
  const links: TopNavLink[] = docsLink
    ? [...SHOWCASE_NAV_LINKS, { title: 'Docs', href: docsLink, external: true }]
    : SHOWCASE_NAV_LINKS

  return (
    <PublicLayout
      showMainContainer={false}
      navLinks={links}
      logo={<ShowcaseBrandMark />}
      siteName={SHOWCASE_BRAND_NAME}
      showNotifications={false}
      headerProps={{
        forceNavLinks: true,
        mobileNavRow: true,
        showSystemUpdate: false,
        beforeAuthContent: <ShowcaseNavActions />,
        signInLabel: t('Sign in / Sign up'),
      }}
    >
      <div className='pt-16'>
        <div className='bg-background/90 sticky top-16 z-30 border-b border-slate-200/70 backdrop-blur lg:hidden dark:border-slate-800'>
          <nav
            aria-label={t('Main navigation')}
            className='flex [scrollbar-width:none] gap-1 overflow-x-auto px-3 py-2'
          >
            {links.map((link) => {
              const itemClass = cn(
                'shrink-0 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium whitespace-nowrap',
                pathname === link.href
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-300'
              )
              return link.external ? (
                <a
                  key={`${link.title}:${link.href}`}
                  href={link.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={itemClass}
                >
                  {t(link.title)}
                </a>
              ) : (
                <Link
                  key={`${link.title}:${link.href}`}
                  to={link.href}
                  className={itemClass}
                >
                  {t(link.title)}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className={cn(className)}>{children}</div>
        <ShowcaseFooter />
      </div>
    </PublicLayout>
  )
}
