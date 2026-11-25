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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'

import { ShowcaseNavActions } from '@/features/showcase/components/showcase-nav-actions'
import { useAuthStore } from '@/stores/auth-store'
import { useSignInDialogStore } from '@/stores/sign-in-dialog-store'

import { SignInDialog } from '../sign-in-dialog'

async function renderStorefrontEntry() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // The public header and the dialog both read the shared status cache; seeding
  // it keeps the render network-free.
  queryClient.setQueryData(['status'], {
    register_enabled: true,
  })

  const root = createRootRoute({ component: Outlet })
  const openSignIn = useSignInDialogStore.getState().openSignIn
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({
        getParentRoute: () => root,
        path: '/',
        component: () => (
          <>
            <ShowcaseNavActions />
            <SignInDialog />
          </>
        ),
      }),
      createRoute({
        getParentRoute: () => root,
        path: '/sign-up',
        component: () => (
          <>
            <button
              type='button'
              onClick={() => openSignIn()}
            >
              Header sign in
            </button>
            <SignInDialog />
          </>
        ),
      }),
      createRoute({
        getParentRoute: () => root,
        path: '/wallet',
        component: () => <div>Wallet page</div>,
      }),
      createRoute({
        getParentRoute: () => root,
        path: '/user-agreement',
        component: () => <div>User agreement page</div>,
      }),
      createRoute({
        getParentRoute: () => root,
        path: '/privacy-policy',
        component: () => <div>Privacy policy page</div>,
      }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await act(() => router.load())
  return { router, ...view }
}

afterEach(() => {
  useSignInDialogStore.getState().closeSignIn()
  useAuthStore.getState().auth.reset('idle')
})

it('the signed-out top-up entry opens the dialog on the current page instead of navigating', async () => {
  const user = userEvent.setup()
  const { router } = await renderStorefrontEntry()

  await user.click(screen.getByRole('button', { name: 'Top up' }))

  const dialog = await screen.findByRole('dialog', { name: 'Sign in' })
  expect(dialog).toBeVisible()
  expect(router.state.location.pathname).toBe('/')
  expect(useSignInDialogStore.getState().redirectTo).toBe('/wallet')
  // Elsewhere in the app the dialog offers the registration entry as well.
  expect(
    within(dialog).getByText(/Don't have an account\?/)
  ).toBeInTheDocument()
})

it('the dialog links to the user agreement and privacy policy in a new tab', async () => {
  const user = userEvent.setup()
  await renderStorefrontEntry()

  await user.click(screen.getByRole('button', { name: 'Top up' }))
  const dialog = await screen.findByRole('dialog', { name: 'Sign in' })

  // Documents are not configured in this fixture: the dialog links must still
  // be present, since they are standalone entries rather than consent text.
  const agreement = within(dialog).getByRole('link', { name: 'User Agreement' })
  expect(agreement).toHaveAttribute('href', '/user-agreement')
  expect(agreement).toHaveAttribute('target', '_blank')
  expect(agreement).toHaveAttribute('rel', 'noopener noreferrer')

  const privacy = within(dialog).getByRole('link', { name: 'Privacy Policy' })
  expect(privacy).toHaveAttribute('href', '/privacy-policy')
  expect(privacy).toHaveAttribute('target', '_blank')
  expect(privacy).toHaveAttribute('rel', 'noopener noreferrer')
})

it('closing the dialog restores the closed state', async () => {
  const user = userEvent.setup()
  await renderStorefrontEntry()

  await user.click(screen.getByRole('button', { name: 'Top up' }))
  await screen.findByRole('dialog', { name: 'Sign in' })

  await user.click(screen.getByRole('button', { name: 'Close' }))

  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Sign in' })).toBeNull()
  )
  expect(useSignInDialogStore.getState().isOpen).toBe(false)
  expect(useSignInDialogStore.getState().redirectTo).toBeUndefined()
})

it('the dialog hides the registration entry when it already sits on the sign-up page', async () => {
  const user = userEvent.setup()
  const { router } = await renderStorefrontEntry()

  await act(() => router.navigate({ to: '/sign-up' }))
  await user.click(screen.getByRole('button', { name: 'Header sign in' }))

  const dialog = await screen.findByRole('dialog', { name: 'Sign in' })
  expect(router.state.location.pathname).toBe('/sign-up')
  expect(within(dialog).queryByText(/Don't have an account\?/)).toBeNull()
})
