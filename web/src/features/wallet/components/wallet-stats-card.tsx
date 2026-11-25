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
import { Activity, BarChart3, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const { t } = useTranslation()
  if (props.loading) {
    return (
      <div className='grid grid-cols-1 gap-3.5 sm:grid-cols-3'>
        {['balance', 'usage', 'requests'].map((key) => (
          <div key={key} className='bg-card rounded-2xl border p-[18px]'>
            <Skeleton className='size-[42px] rounded-xl' />
            <Skeleton className='mt-3 h-3.5 w-full' />
            <Skeleton className='mt-2 h-[26px] w-24' />
          </div>
        ))}
      </div>
    )
  }

  const stats: {
    label: string
    value: string
    description: string
    icon: typeof WalletCards
    gradient: string
  }[] = [
    {
      label: t('Current Balance'),
      value: formatQuota(props.user?.quota ?? 0),
      description: t('Remaining quota'),
      icon: WalletCards,
      gradient: 'linear-gradient(140deg,#2b78f5,#1553c4)',
    },
    {
      label: t('Total Usage'),
      value: formatQuota(props.user?.used_quota ?? 0),
      description: t('Total consumed quota'),
      icon: BarChart3,
      gradient: 'linear-gradient(140deg,#059669,#047857)',
    },
    {
      label: t('API Requests'),
      value: (props.user?.request_count ?? 0).toLocaleString(),
      description: t('Total requests made'),
      icon: Activity,
      gradient: 'linear-gradient(140deg,#f97316,#ea580c)',
    },
  ]

  return (
    <div className='grid grid-cols-1 gap-3.5 sm:grid-cols-3'>
      {stats.map((item) => (
        <div
          key={item.label}
          className='bg-card flex items-start gap-3.5 rounded-2xl border p-[18px] shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(15,23,42,0.10)]'
        >
          <span
            className='tb-gradient-icon size-[42px] shrink-0 rounded-xl'
            style={{ background: item.gradient }}
          >
            <item.icon className='size-5' strokeWidth={1.8} aria-hidden='true' />
          </span>
          <div className='min-w-0 flex-1'>
            <div className='text-muted-foreground truncate text-[13px] font-medium'>
              {item.label}
            </div>
            <div className='tb-stat-num break-all'>{item.value}</div>
            <div className='text-muted-foreground mt-0.5 truncate text-[12.5px]'>
              {item.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
