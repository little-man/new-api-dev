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
import { create } from 'zustand'

interface SignInDialogState {
  isOpen: boolean
  /** Where to send the visitor once the sign-in succeeds. */
  redirectTo?: string
  openSignIn: (redirectTo?: string) => void
  closeSignIn: () => void
}

/**
 * Controls the in-page sign-in dialog. Storefront entry points call
 * `openSignIn` instead of navigating to `/sign-in`, so the visitor keeps the
 * page they were reading while signing in.
 */
export const useSignInDialogStore = create<SignInDialogState>()((set) => ({
  isOpen: false,
  redirectTo: undefined,
  openSignIn: (redirectTo) => set({ isOpen: true, redirectTo }),
  closeSignIn: () => set({ isOpen: false, redirectTo: undefined }),
}))
