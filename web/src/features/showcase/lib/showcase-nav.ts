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
import type { TopNavLink } from '@/components/layout/types'

/**
 * Public showcase routes. These pages are reachable without signing in and
 * intentionally never collide with the authenticated `/models`, `/playground`
 * or `/dashboard` routes.
 */
export const SHOWCASE_ROUTES = {
  home: '/',
  market: '/market',
  trial: '/trial',
  enterprise: '/enterprise',
  // `/console` is a legacy alias for `/dashboard` (see lib/legacy-route.ts).
  console: '/console-preview',
} as const

export const SHOWCASE_NAV_LINKS: TopNavLink[] = [
  { title: 'Home', href: SHOWCASE_ROUTES.home },
  { title: 'Model Marketplace', href: SHOWCASE_ROUTES.market },
  { title: 'Online Trial', href: SHOWCASE_ROUTES.trial },
  { title: 'Console', href: SHOWCASE_ROUTES.console },
  { title: 'Enterprise', href: SHOWCASE_ROUTES.enterprise },
]

export const MODEL_KIND_LABELS: Record<string, string> = {
  text: 'Text',
  vision: 'Multimodal',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  embedding: 'Embedding',
}
