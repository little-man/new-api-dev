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
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { fetchTokenKey, updateApiKeyStatus } from '@/features/keys/api'
import type { ApiKey } from '@/features/keys/types'
import {
  formatLocalCurrencyAmount,
  formatQuotaWithCurrency,
} from '@/lib/currency'
import { cn } from '@/lib/utils'

import { StatusBadge } from '../components/showcase-status-badge'
import { useConsoleData } from '../hooks/use-console-data'

const TH =
  'px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'
const TD = 'px-3 py-2 text-[12.5px] text-slate-700 dark:text-slate-200'

function PanelShell({
  title,
  action,
  note,
  children,
}: {
  title: string
  action?: ReactNode
  note?: ReactNode
  children: ReactNode
}) {
  return (
    <div className='overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'>
      <div className='flex items-center justify-between gap-2 px-4 py-3'>
        <h3 className='text-[13px] font-bold text-slate-900 dark:text-slate-100'>
          {title}
        </h3>
        {action}
      </div>
      {children}
      {note && (
        <p className='border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400 dark:border-slate-800'>
          {note}
        </p>
      )}
    </div>
  )
}

function PanelMessage({ text }: { text: string }) {
  return (
    <p className='border-t border-slate-100 px-4 py-8 text-center text-[12.5px] text-slate-400 dark:border-slate-800'>
      {text}
    </p>
  )
}

function PanelBody({
  loading,
  isEmpty,
  emptyText,
  children,
}: {
  loading: boolean
  isEmpty: boolean
  emptyText: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  if (loading) return <PanelMessage text={t('Loading...')} />
  if (isEmpty) return <PanelMessage text={emptyText} />
  return children
}

function headerRow(labels: string[]) {
  return (
    <tr className='bg-slate-50 dark:bg-slate-800/60'>
      {labels.map((label) => (
        <th key={label} className={TH}>
          {label}
        </th>
      ))}
    </tr>
  )
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function LiveOverviewPanel() {
  const { t } = useTranslation()
  const data = useConsoleData()

  if (data.overviewLoading) {
    return <PanelMessage text={t('Loading...')} />
  }

  const today = data.today
  const yesterday = data.yesterday
  const delta =
    yesterday && yesterday.calls > 0
      ? ((today.calls - yesterday.calls) / yesterday.calls) * 100
      : null

  const kpis = [
    {
      label: t('Calls today'),
      value: today.calls.toLocaleString(),
      hint:
        delta === null
          ? t('No calls yesterday to compare with')
          : t('{{value}}% vs yesterday', { value: delta.toFixed(1) }),
    },
    {
      label: t('Tokens used today'),
      value: today.tokens.toLocaleString(),
      hint: t('{{amount}} spent today', {
        amount: formatQuotaWithCurrency(today.quota),
      }),
    },
    {
      label: t('Calls in the last 7 days'),
      value: data.week.calls.toLocaleString(),
      hint: t('{{amount}} spent this week', {
        amount: formatQuotaWithCurrency(data.week.quota),
      }),
    },
  ]

  const max = Math.max(...data.days.map((day) => day.calls), 0)

  return (
    <div className='grid gap-3 md:grid-cols-3'>
      <div className='rounded-xl border border-slate-200 bg-white p-4 md:col-span-3 dark:border-slate-800 dark:bg-slate-900'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <span className='text-[11.5px] text-slate-500 dark:text-slate-400'>
            {t('Account balance')}
          </span>
          <span className='text-[11px] text-slate-400'>
            {t('Deducted per actual usage')}
          </span>
        </div>
        <b className='mt-1.5 block text-[clamp(26px,5vw,32px)] font-extrabold text-slate-900 tabular-nums dark:text-slate-100'>
          {formatQuotaWithCurrency(data.account?.quota ?? 0)}
        </b>
        <p className='mt-1 text-[11.5px] text-slate-500 dark:text-slate-400'>
          {t('{{month}} consumed this month', {
            month: formatQuotaWithCurrency(data.monthConsumed),
          })}
        </p>
        <div className='mt-3 flex flex-wrap gap-2'>
          <Link
            to='/wallet'
            className='inline-flex h-8 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700'
          >
            {t('Top up')}
          </Link>
          <Link
            to='/keys'
            className='inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:text-slate-200'
          >
            {t('Create key')}
          </Link>
        </div>
      </div>

      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 md:block dark:border-slate-800 dark:bg-slate-900'
        >
          <span className='text-[11.5px] text-slate-500 dark:text-slate-400'>
            {kpi.label}
          </span>
          <b className='text-xl font-extrabold text-slate-900 tabular-nums md:mt-1 md:block dark:text-slate-100'>
            {kpi.value}
          </b>
          <em className='w-full text-right text-[11px] text-slate-400 not-italic md:text-left'>
            {kpi.hint}
          </em>
        </div>
      ))}

      <div className='rounded-xl border border-slate-200 bg-white p-4 md:col-span-3 dark:border-slate-800 dark:bg-slate-900'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h3 className='text-[13px] font-bold text-slate-900 dark:text-slate-100'>
            {t('Calls in the last 7 days')}
          </h3>
          <span className='text-[11px] text-slate-400'>
            {t('Daily totals from your own usage records')}
          </span>
        </div>
        <div className='mt-4 flex items-end gap-[5px]'>
          {data.days.map((day, index) => {
            // Percentage heights cannot resolve inside an auto-height flex
            // column, so the bar height is emitted in pixels.
            const ratio = max > 0 ? day.calls / max : 0
            const height = Math.round(
              day.calls > 0 ? Math.max(6, ratio * 84) : 2
            )
            const isLast = index === data.days.length - 1
            return (
              <div
                key={day.key}
                className='flex min-w-0 flex-1 flex-col items-center justify-end gap-1'
              >
                <span className='text-[9px] font-medium text-slate-400 tabular-nums md:text-[10px]'>
                  {day.calls >= 1000
                    ? `${(day.calls / 1000).toFixed(1)}k`
                    : day.calls}
                </span>
                <span
                  className={cn(
                    'w-full max-w-[42px] rounded-t-[5px] rounded-b-[2px]',
                    isLast
                      ? 'bg-gradient-to-b from-blue-400 to-blue-600'
                      : 'bg-blue-200 dark:bg-blue-500/30'
                  )}
                  style={{ height: `${height}px` }}
                />
                <em className='text-[8.5px] text-slate-400 not-italic md:text-[10px]'>
                  {day.label}
                </em>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function keyStatus(item: ApiKey): {
  tone: 'ok' | 'off'
  labelKey: string
} {
  if (item.status === 1) return { tone: 'ok', labelKey: 'Enabled' }
  if (item.status === 3) return { tone: 'off', labelKey: 'Expired' }
  if (item.status === 4) return { tone: 'off', labelKey: 'Quota exhausted' }
  return { tone: 'off', labelKey: 'Disabled' }
}

export function LiveKeysPanel() {
  const { t } = useTranslation()
  const { keys, keysLoading, refetchKeys } = useConsoleData()
  const [busyId, setBusyId] = useState<number | null>(null)

  const copyKey = async (id: number) => {
    setBusyId(id)
    try {
      const res = await fetchTokenKey(id)
      if (res.success && res.data?.key) {
        await navigator.clipboard.writeText(`sk-${res.data.key}`)
        toast.success(t('Key copied'))
      } else {
        toast.error(res.message || t('Copy failed, please copy manually'))
      }
    } catch {
      toast.error(t('Copy failed, please copy manually'))
    } finally {
      setBusyId(null)
    }
  }

  const toggleKey = async (item: ApiKey) => {
    const next = item.status === 1 ? 2 : 1
    setBusyId(item.id)
    try {
      const res = await updateApiKeyStatus(item.id, next)
      if (res.success) {
        toast.success(next === 1 ? t('Key enabled') : t('Key disabled'))
        await refetchKeys()
      } else {
        toast.error(res.message || t('Operation failed'))
      }
    } catch {
      toast.error(t('Operation failed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PanelShell
      title={t('API keys')}
      action={
        <Link
          to='/keys'
          className='rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700'
        >
          {t('Manage keys')}
        </Link>
      }
      note={t(
        'The full key is only fetched when you copy it. Create keys and set quotas in the console.'
      )}
    >
      <PanelBody
        loading={keysLoading}
        isEmpty={keys.length === 0}
        emptyText={t('No API keys yet. Create one to start calling.')}
      >
        <table className='w-full table-fixed border-collapse text-left'>
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '31%' }} />
            <col style={{ width: '19%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            {headerRow([
              t('Name'),
              t('Key'),
              t('Created'),
              t('Status'),
              t('Actions'),
            ])}
          </thead>
          <tbody>
            {keys.map((item) => {
              const status = keyStatus(item)
              const busy = busyId === item.id
              return (
                <tr
                  key={item.id}
                  className='border-t border-slate-100 dark:border-slate-800'
                >
                  <td data-l={t('Name')} className={TD}>
                    {item.name}
                  </td>
                  <td
                    data-l={t('Key')}
                    className='px-3 py-2 font-mono text-[11.5px] text-slate-600 dark:text-slate-300'
                  >
                    {`sk-${item.key.slice(0, 4)}…${item.key.slice(-4)}`}
                  </td>
                  <td
                    data-l={t('Created')}
                    className='px-3 py-2 text-[12px] text-slate-500 tabular-nums'
                  >
                    {formatDate(item.created_time)}
                  </td>
                  <td data-l={t('Status')} className='px-3 py-2'>
                    <StatusBadge
                      tone={status.tone}
                      label={t(status.labelKey)}
                    />
                  </td>
                  <td
                    data-l=''
                    className='px-3 py-2 text-right whitespace-nowrap'
                  >
                    <button
                      type='button'
                      disabled={busy}
                      onClick={() => copyKey(item.id)}
                      className='mr-2 text-[11.5px] font-semibold text-blue-700 hover:underline disabled:opacity-50 dark:text-blue-400'
                    >
                      {t('Copy')}
                    </button>
                    <button
                      type='button'
                      disabled={busy}
                      onClick={() => toggleKey(item)}
                      className='text-[11.5px] font-semibold text-slate-600 hover:underline disabled:opacity-50 dark:text-slate-300'
                    >
                      {item.status === 1 ? t('Disable') : t('Restore')}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </PanelBody>
    </PanelShell>
  )
}

export function LiveLogsPanel() {
  const { t } = useTranslation()
  const { logs, logsLoading } = useConsoleData()

  return (
    <PanelShell
      title={t('Recent usage logs')}
      action={
        <Link
          to='/usage-logs'
          className='text-[11px] font-semibold text-blue-700 hover:underline dark:text-blue-400'
        >
          {t('All logs')} →
        </Link>
      }
    >
      <PanelBody
        loading={logsLoading}
        isEmpty={logs.length === 0}
        emptyText={t('No calls recorded yet.')}
      >
        <table className='w-full table-fixed border-collapse text-left'>
          <colgroup>
            <col style={{ width: '16%' }} />
            <col style={{ width: '33%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            {headerRow([
              t('Time'),
              t('Model'),
              t('Tokens'),
              t('Latency'),
              t('Status'),
            ])}
          </thead>
          <tbody>
            {logs.map((item) => {
              const ok = item.type === 2
              return (
                <tr
                  key={item.id}
                  className='border-t border-slate-100 dark:border-slate-800'
                >
                  <td
                    data-l={t('Time')}
                    className='px-3 py-2 text-[12px] text-slate-500 tabular-nums'
                  >
                    {formatTime(item.created_at)}
                  </td>
                  <td
                    data-l={t('Model')}
                    className='truncate px-3 py-2 font-mono text-[11.5px] text-slate-600 dark:text-slate-300'
                  >
                    {item.model_name || '-'}
                  </td>
                  <td
                    data-l={t('Tokens')}
                    className='px-3 py-2 text-[12px] text-slate-500 tabular-nums'
                  >
                    {(
                      item.prompt_tokens + item.completion_tokens
                    ).toLocaleString()}
                  </td>
                  <td
                    data-l={t('Latency')}
                    className='px-3 py-2 text-[12px] text-slate-500 tabular-nums'
                  >
                    {item.use_time > 0 ? `${item.use_time}s` : '-'}
                  </td>
                  <td data-l={t('Status')} className='px-3 py-2'>
                    <StatusBadge
                      tone={ok ? 'ok' : 'warn'}
                      label={ok ? t('Success') : t('Failed')}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </PanelBody>
    </PanelShell>
  )
}

function topupBadge(status: 'success' | 'pending' | 'expired'): {
  tone: 'ok' | 'warn' | 'off'
  labelKey: string
} {
  if (status === 'success') return { tone: 'ok', labelKey: 'Paid' }
  if (status === 'pending') return { tone: 'warn', labelKey: 'Pending' }
  return { tone: 'off', labelKey: 'Expired' }
}

export function LiveBillsPanel() {
  const { t } = useTranslation()
  const { bills, billsLoading } = useConsoleData()

  return (
    <PanelShell
      title={t('Billing history')}
      action={
        <Link
          to='/wallet'
          className='text-[11px] font-semibold text-blue-700 hover:underline dark:text-blue-400'
        >
          {t('Top up')} →
        </Link>
      }
      note={t(
        'Top-ups are listed here; per-call charges are deducted from your balance and detailed in the usage logs.'
      )}
    >
      <PanelBody
        loading={billsLoading}
        isEmpty={bills.length === 0}
        emptyText={t('No top-up records yet.')}
      >
        <table className='w-full table-fixed border-collapse text-left'>
          <colgroup>
            <col style={{ width: '26%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '26%' }} />
            <col style={{ width: '26%' }} />
          </colgroup>
          <thead>
            {headerRow([t('Date'), t('Type'), t('Amount'), t('Status')])}
          </thead>
          <tbody>
            {bills.map((item) => {
              const badge = topupBadge(item.status)
              return (
                <tr
                  key={item.id}
                  className='border-t border-slate-100 dark:border-slate-800'
                >
                  <td
                    data-l={t('Date')}
                    className='px-3 py-2 text-[12px] text-slate-500 tabular-nums'
                  >
                    {formatDate(item.create_time)}
                  </td>
                  <td data-l={t('Type')} className='px-3 py-2'>
                    <StatusBadge tone='ok' label={t('Top up')} />
                  </td>
                  <td
                    data-l={t('Amount')}
                    className='px-3 py-2 text-[12px] font-semibold text-slate-700 tabular-nums dark:text-slate-200'
                  >
                    +{formatLocalCurrencyAmount(item.money)}
                  </td>
                  <td data-l={t('Status')} className='px-3 py-2'>
                    <StatusBadge tone={badge.tone} label={t(badge.labelKey)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </PanelBody>
    </PanelShell>
  )
}
