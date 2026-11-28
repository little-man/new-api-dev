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
import { Link } from '@tanstack/react-router'
import { ArrowRight, Flame, ShieldCheck, TrendingDown } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { StaggerContainer, StaggerItem } from '@/components/page-transition'
import { Button } from '@/components/ui/button'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { useSummaryCardsConfig } from '@/features/dashboard/hooks/use-dashboard-config'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { useStatus } from '@/hooks/use-status'
import { getCurrencyLabel, isCurrencyDisplayEnabled } from '@/lib/currency'
import { formatNumber, formatQuota } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { computeTimeRange } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { StatCard } from '../ui/stat-card'

const SUMMARY_SPARKLINE_BUCKETS = 12

type SummarySparklineKey = 'balance' | 'usage' | 'requests'

function getBucketIndex(
  timestamp: number,
  start: number,
  end: number,
  bucketCount: number
): number {
  if (end <= start) return 0
  const ratio = (timestamp - start) / (end - start)
  return Math.min(bucketCount - 1, Math.max(0, Math.floor(ratio * bucketCount)))
}

function buildSummarySparklines(
  data: QuotaDataItem[],
  currentBalance: number,
  start: number,
  end: number
): Record<SummarySparklineKey, number[]> {
  const usage = Array.from({ length: SUMMARY_SPARKLINE_BUCKETS }, () => 0)
  const requests = Array.from({ length: SUMMARY_SPARKLINE_BUCKETS }, () => 0)

  for (const item of data) {
    const timestamp = Number(item.created_at) || start
    const index = getBucketIndex(
      timestamp,
      start,
      end,
      SUMMARY_SPARKLINE_BUCKETS
    )
    usage[index] += Number(item.quota) || 0
    requests[index] += Number(item.count) || 0
  }

  let balance = currentBalance
  const balanceTrend = Array.from(
    { length: SUMMARY_SPARKLINE_BUCKETS },
    () => 0
  )

  for (let index = SUMMARY_SPARKLINE_BUCKETS - 1; index >= 0; index--) {
    balanceTrend[index] = Math.max(0, balance)
    balance += usage[index]
  }

  return {
    balance: balanceTrend,
    usage,
    requests,
  }
}

function getSummarySparkline(
  key: string,
  sparklineData: Record<SummarySparklineKey, number[]>
): number[] | undefined {
  if (key === 'usage') return sparklineData.usage
  if (key === 'requests') return sparklineData.requests
  return undefined
}

function getRunwayDays(
  remainQuota: number,
  recentUsage: number
): number | null {
  if (remainQuota <= 0 || recentUsage <= 0) return null
  const days = remainQuota / recentUsage
  if (!Number.isFinite(days)) return null
  return days
}

type HealthLevel = 'healthy' | 'caution' | 'critical'

function getHealthLevel(remainQuota: number, recentUsage: number): HealthLevel {
  if (remainQuota <= 0) return 'critical'
  const days = getRunwayDays(remainQuota, recentUsage)
  if (days !== null && days < 3) return 'caution'
  return 'healthy'
}

const HEALTH_CONFIG: Record<HealthLevel, { labelKey: string }> = {
  healthy: {
    labelKey: 'Healthy',
  },
  caution: {
    labelKey: 'Low balance',
  },
  critical: {
    labelKey: 'Balance depleted',
  },
}

export function SummaryCards() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const { status, loading } = useStatus()

  const summaryTimeRange = useMemo(() => computeTimeRange(1), [])
  const remainQuota = Number(user?.quota ?? 0)
  const usedQuota = Number(user?.used_quota ?? 0)
  const requestCount = Number(user?.request_count ?? 0)

  const usageTrendQuery = useQuery({
    queryKey: [
      'dashboard',
      'overview',
      'summary-sparklines',
      summaryTimeRange.start_timestamp,
      summaryTimeRange.end_timestamp,
    ],
    queryFn: async () =>
      requireServerSuccess(
        await getUserQuotaDates({
          start_timestamp: summaryTimeRange.start_timestamp,
          end_timestamp: summaryTimeRange.end_timestamp,
          default_time: 'hour',
        })
      ),
    staleTime: 60 * 1000,
  })

  const summaryValues = useMemo(() => {
    return {
      usedDisplay: formatQuota(usedQuota),
      requestCountDisplay: formatNumber(requestCount),
    }
  }, [requestCount, usedQuota])

  const currencyEnabledFromStore = isCurrencyDisplayEnabled()
  const statusCurrencyFlag =
    typeof status?.display_in_currency === 'boolean'
      ? Boolean(status.display_in_currency)
      : undefined
  const currencyEnabled =
    statusCurrencyFlag !== undefined
      ? statusCurrencyFlag
      : currencyEnabledFromStore
  const currencyLabel = currencyEnabled ? getCurrencyLabel() : 'Tokens'

  const sparklineData = useMemo(
    () =>
      buildSummarySparklines(
        usageTrendQuery.data?.data ?? [],
        remainQuota,
        summaryTimeRange.start_timestamp,
        summaryTimeRange.end_timestamp
      ),
    [
      remainQuota,
      summaryTimeRange.end_timestamp,
      summaryTimeRange.start_timestamp,
      usageTrendQuery.data?.data,
    ]
  )

  const recentUsage = useMemo(
    () =>
      (usageTrendQuery.data?.data ?? []).reduce(
        (total, item) => total + (Number(item.quota) || 0),
        0
      ),
    [usageTrendQuery.data?.data]
  )

  const healthLevel = getHealthLevel(remainQuota, recentUsage)
  const healthCfg = HEALTH_CONFIG[healthLevel]
  const runwayDays = getRunwayDays(remainQuota, recentUsage)

  const todayUsageDisplay = formatQuota(recentUsage)
  let runwayDisplay: string
  if (runwayDays !== null) {
    if (runwayDays < 1) {
      runwayDisplay = t('Less than 1 day left')
    } else if (runwayDays > 999) {
      runwayDisplay = `999+ ${t('days')}`
    } else {
      runwayDisplay = `~${formatNumber(Math.floor(runwayDays))} ${t('days')}`
    }
  } else if (remainQuota <= 0) {
    runwayDisplay = t('Balance depleted')
  } else {
    runwayDisplay = t('No recent usage')
  }

  const iconGradients = [
    'linear-gradient(140deg,#2b78f5,#1553c4)',
    'linear-gradient(140deg,#059669,#047857)',
    'linear-gradient(140deg,#f97316,#ea580c)',
  ]
  const items = useSummaryCardsConfig({
    ...summaryValues,
    todayUsageDisplay,
    currencyEnabled,
    currencyLabel,
  }).map((config, index) => ({
    key: config.key,
    title: config.title,
    value: config.value,
    desc: config.description,
    icon: config.icon,
    iconStyle: { background: iconGradients[index] ?? iconGradients[0] },
    sparkline:
      config.key === 'todayUsage'
        ? sparklineData.usage
        : getSummarySparkline(config.key, sparklineData),
  }))

  let quotaToneClass = ''
  let quotaDotClass = ''
  if (healthLevel === 'critical') {
    quotaToneClass =
      'border-destructive/30 bg-destructive/10 text-destructive'
    quotaDotClass = 'bg-destructive'
  } else if (healthLevel === 'caution') {
    quotaToneClass =
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
    quotaDotClass = 'bg-warning'
  }

  return (
    <>
      <StaggerContainer className='grid grid-cols-1 gap-3.5 sm:grid-cols-3'>
        {items.map((it) => (
          <StaggerItem key={it.key}>
            <StatCard
              title={it.title}
              value={it.value}
              description={it.desc}
              icon={it.icon}
              iconStyle={it.iconStyle}
              sparkline={it.sparkline}
              sparklineVariant='line'
              loading={loading}
              emphasis
            />
          </StaggerItem>
        ))}
      </StaggerContainer>

      <div className='bg-card mt-4 mb-4 rounded-2xl border shadow-[0_10px_30px_rgba(15,23,42,0.06)]'>
        <div className='flex items-center gap-2.5 px-[18px] pt-4 pb-3'>
          <h3 className='text-[15px] font-bold'>{t('Credit remaining')}</h3>
          <span className='text-muted-foreground hidden text-[13px] sm:inline'>
            {t('Available balance on this account')}
          </span>
          <span className={cn('tb-pill ml-auto', quotaToneClass)}>
            <span
              className={cn('tb-pill-dot', quotaDotClass)}
              aria-hidden='true'
            />
            {t(healthCfg.labelKey)}
          </span>
        </div>
        <div className='flex flex-wrap items-center gap-4 px-[18px] pt-1 pb-[18px]'>
          <div className='tb-gradient-text text-[34px] leading-none font-extrabold tracking-[-0.02em] tabular-nums'>
            {formatQuota(remainQuota)}
          </div>
          <div className='ml-auto flex flex-wrap items-center gap-x-6 gap-y-3'>
            <div>
              <div className='flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400'>
                <Flame className='size-3 shrink-0' aria-hidden='true' />
                <span>{t('Last 24h usage')}</span>
              </div>
              <b className='mt-0.5 block text-base font-bold tabular-nums'>
                {formatQuota(recentUsage)}
              </b>
            </div>
            <div>
              <div className='flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400'>
                {runwayDays !== null && runwayDays < 3 ? (
                  <TrendingDown className='size-3 shrink-0' aria-hidden='true' />
                ) : (
                  <ShieldCheck className='size-3 shrink-0' aria-hidden='true' />
                )}
                <span>{t('Runway')}</span>
              </div>
              <b
                className={cn(
                  'mt-0.5 block text-base font-bold tabular-nums',
                  healthLevel === 'critical' && 'text-destructive',
                  healthLevel === 'caution' && 'text-warning'
                )}
              >
                {runwayDisplay}
              </b>
            </div>
            <Button
              variant='outline'
              className='gap-1 rounded-[10px]'
              render={<Link to='/wallet' />}
            >
              <span>{t('Wallet')}</span>
              <ArrowRight data-icon='inline-end' />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
