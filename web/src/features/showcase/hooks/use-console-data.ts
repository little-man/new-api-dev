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
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getUserQuotaDates } from '@/features/dashboard/api'
import { getApiKeys } from '@/features/keys/api'
import { getUserLogs } from '@/features/usage-logs/api'
import type { UsageLog } from '@/features/usage-logs/data/schema'
import { getUserBillingHistory } from '@/features/wallet/api'
import { getSelf } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

const DAY_SECONDS = 86_400

export interface ConsoleDay {
  key: string
  label: string
  calls: number
  quota: number
  tokens: number
}

function dayKey(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function dayLabel(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

/**
 * Real account data for the signed-in storefront console. Every figure comes
 * from the same endpoints the authenticated dashboard uses; nothing is
 * fabricated for the marketing surface. Signed-out visitors get no queries at
 * all and see the labelled demo data instead.
 */
export function useConsoleData() {
  const isAuthenticated = !!useAuthStore((state) => state.auth.user)

  const accountQuery = useQuery({
    queryKey: ['showcase-console', 'account'],
    queryFn: getSelf,
    enabled: isAuthenticated,
    staleTime: 60_000,
  })

  const usageQuery = useQuery({
    queryKey: ['showcase-console', 'usage'],
    queryFn: async () => {
      const end = Math.floor(Date.now() / 1000)
      const res = await getUserQuotaDates({
        start_timestamp: end - 29 * DAY_SECONDS,
        end_timestamp: end,
      })
      return res.data ?? []
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })

  const keysQuery = useQuery({
    queryKey: ['showcase-console', 'keys'],
    queryFn: async () =>
      (await getApiKeys({ p: 1, size: 5 })).data?.items ?? [],
    enabled: isAuthenticated,
  })

  const logsQuery = useQuery({
    queryKey: ['showcase-console', 'logs'],
    queryFn: async () => {
      const res = await getUserLogs({ p: 1, page_size: 8 })
      return (res.data?.items ?? []) as UsageLog[]
    },
    enabled: isAuthenticated,
  })

  const billsQuery = useQuery({
    queryKey: ['showcase-console', 'bills'],
    queryFn: async () => (await getUserBillingHistory(1, 6)).data?.items ?? [],
    enabled: isAuthenticated,
  })

  const usage = useMemo(() => {
    const items = usageQuery.data ?? []
    const byDay = new Map<
      string,
      { calls: number; quota: number; tokens: number }
    >()
    const monthPrefix = dayKey(Math.floor(Date.now() / 1000)).replace(
      /-\d+$/,
      ''
    )
    let monthConsumed = 0

    for (const item of items) {
      const key = dayKey(item.created_at)
      const entry = byDay.get(key) ?? { calls: 0, quota: 0, tokens: 0 }
      entry.calls += item.count ?? 0
      entry.quota += item.quota ?? 0
      entry.tokens += item.token_used ?? 0
      byDay.set(key, entry)
      if (key.startsWith(monthPrefix)) monthConsumed += item.quota ?? 0
    }

    const now = Math.floor(Date.now() / 1000)
    const days: ConsoleDay[] = []
    for (let offset = 6; offset >= 0; offset -= 1) {
      const timestamp = now - offset * DAY_SECONDS
      const key = dayKey(timestamp)
      const entry = byDay.get(key)
      days.push({
        key,
        label: dayLabel(timestamp),
        calls: entry?.calls ?? 0,
        quota: entry?.quota ?? 0,
        tokens: entry?.tokens ?? 0,
      })
    }

    const week = days.reduce(
      (total, day) => ({
        calls: total.calls + day.calls,
        quota: total.quota + day.quota,
      }),
      { calls: 0, quota: 0 }
    )

    return { days, monthConsumed, week }
  }, [usageQuery.data])

  const emptyDay: ConsoleDay = {
    key: '',
    label: '',
    calls: 0,
    quota: 0,
    tokens: 0,
  }
  const today = usage.days.at(-1) ?? emptyDay
  const yesterday = usage.days.at(-2)

  return {
    isAuthenticated,
    account: accountQuery.data?.data,
    days: usage.days,
    today,
    yesterday,
    week: usage.week,
    monthConsumed: usage.monthConsumed,
    keys: keysQuery.data ?? [],
    logs: logsQuery.data ?? [],
    bills: billsQuery.data ?? [],
    overviewLoading:
      isAuthenticated && (accountQuery.isLoading || usageQuery.isLoading),
    keysLoading: isAuthenticated && keysQuery.isLoading,
    logsLoading: isAuthenticated && logsQuery.isLoading,
    billsLoading: isAuthenticated && billsQuery.isLoading,
    refetchKeys: keysQuery.refetch,
  }
}
