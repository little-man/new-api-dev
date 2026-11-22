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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { ShowcaseShell } from '../components/showcase-shell'
import { StatusBadge } from '../components/showcase-status-badge'
import { useConsoleData } from '../hooks/use-console-data'
import {
  LiveBillsPanel,
  LiveKeysPanel,
  LiveLogsPanel,
  LiveOverviewPanel,
} from './console-live'

type ConsoleTab = 'overview' | 'keys' | 'logs' | 'bills'

const DAILY_USAGE = [
  { label: '11-16', value: 9.8 },
  { label: '11-17', value: 11.2 },
  { label: '11-18', value: 10.6 },
  { label: '11-19', value: 14.1 },
  { label: '11-20', value: 16.8 },
  { label: '11-21', value: 15.4 },
  { label: '11-22', value: 18.4 },
]

const DEMO_KEYS = [
  {
    name: 'production',
    key: 'sk-9f2c…41d7',
    created: '2026-08-12',
    enabled: true,
  },
  {
    name: 'staging',
    key: 'sk-4a71…e0c3',
    created: '2026-09-03',
    enabled: true,
  },
  {
    name: 'batch-jobs',
    key: 'sk-c18b…7a52',
    created: '2026-10-01',
    enabled: true,
  },
  {
    name: 'analytics',
    key: 'sk-77de…9f18',
    created: '2026-10-19',
    enabled: false,
  },
  {
    name: 'sandbox',
    key: 'sk-2b90…3c66',
    created: '2026-11-07',
    enabled: true,
  },
]

const DEMO_LOGS = [
  {
    time: '11-22 14:02',
    model: 'deepseek-v4.1-flash',
    tokens: 1_842,
    latency: '486ms',
    status: 'ok',
  },
  {
    time: '11-22 13:58',
    model: 'kimi-k3',
    tokens: 3_271,
    latency: '712ms',
    status: 'ok',
  },
  {
    time: '11-22 13:51',
    model: 'glm-5.3-flash',
    tokens: 922,
    latency: '388ms',
    status: 'ok',
  },
  {
    time: '11-22 13:44',
    model: 'qwen3.8-27b',
    tokens: 2_104,
    latency: '604ms',
    status: 'ok',
  },
  {
    time: '11-22 13:39',
    model: 'deepseek-v4-pro',
    tokens: 5_630,
    latency: '1.24s',
    status: 'ok',
  },
  {
    time: '11-22 13:33',
    model: 'kimi-k3',
    tokens: 1_488,
    latency: '598ms',
    status: 'warn',
  },
  {
    time: '11-22 13:27',
    model: 'glm-5.3-flash',
    tokens: 764,
    latency: '402ms',
    status: 'ok',
  },
  {
    time: '11-22 13:20',
    model: 'deepseek-v4.1-flash',
    tokens: 2_896,
    latency: '521ms',
    status: 'ok',
  },
]

const DEMO_BILLS = [
  {
    date: '2026-11-22',
    type: 'charge',
    amount: '-¥18.42',
    balance: '¥1,284.60',
  },
  {
    date: '2026-11-21',
    type: 'charge',
    amount: '-¥15.40',
    balance: '¥1,303.02',
  },
  {
    date: '2026-11-18',
    type: 'topup',
    amount: '+¥1,000.00',
    balance: '¥1,318.42',
  },
  { date: '2026-11-17', type: 'charge', amount: '-¥11.20', balance: '¥318.42' },
  { date: '2026-11-14', type: 'charge', amount: '-¥9.80', balance: '¥329.62' },
  { date: '2026-11-10', type: 'topup', amount: '+¥300.00', balance: '¥339.42' },
]

function OverviewPanel() {
  const { t } = useTranslation()
  const max = Math.max(...DAILY_USAGE.map((item) => item.value))

  const kpis = [
    {
      label: t('Calls today'),
      value: '18,420',
      hint: t('+19.5% vs yesterday'),
    },
    {
      label: t('Success rate'),
      value: '99.2%',
      hint: t('2 requests throttled'),
    },
    { label: t('Average latency'), value: '612ms', hint: 'P95 604ms' },
  ]

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
          ¥1,284.60
        </b>
        <p className='mt-1 text-[11.5px] text-slate-500 dark:text-slate-400'>
          {t('¥715.40 consumed this month · about 52 days of runway')}
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
            {t('Daily totals, failed requests included')}
          </span>
        </div>
        <div className='mt-4 flex items-end gap-[5px]'>
          {DAILY_USAGE.map((item, index) => {
            // Percentage heights cannot resolve inside an auto-height flex
            // column, so the bar height is emitted in pixels.
            const height = Math.round(Math.max(6, (item.value / max) * 84))
            const isLast = index === DAILY_USAGE.length - 1
            return (
              <div
                key={item.label}
                className='flex min-w-0 flex-1 flex-col items-center justify-end gap-1'
              >
                <span className='text-[9px] font-medium text-slate-400 tabular-nums md:text-[10px]'>
                  {item.value}k
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
                  {item.label}
                </em>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function KeysPanel() {
  const { t } = useTranslation()
  return (
    <div className='overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'>
      <div className='flex items-center justify-between gap-2 px-4 py-3'>
        <h3 className='text-[13px] font-bold text-slate-900 dark:text-slate-100'>
          {t('API keys')}
        </h3>
        <span className='rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white'>
          {t('New key')}
        </span>
      </div>
      <table className='w-full table-fixed border-collapse text-left'>
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '31%' }} />
          <col style={{ width: '19%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '16%' }} />
        </colgroup>
        <thead>
          <tr className='bg-slate-50 dark:bg-slate-800/60'>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Name')}
            </th>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Key')}
            </th>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Created')}
            </th>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Status')}
            </th>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {DEMO_KEYS.map((item) => (
            <tr
              key={item.key}
              className='border-t border-slate-100 dark:border-slate-800'
            >
              <td
                data-l={t('Name')}
                className='px-3 py-2 text-[12.5px] text-slate-700 dark:text-slate-200'
              >
                {item.name}
              </td>
              <td
                data-l={t('Key')}
                className='px-3 py-2 font-mono text-[11.5px] text-slate-600 dark:text-slate-300'
              >
                {item.key}
              </td>
              <td
                data-l={t('Created')}
                className='px-3 py-2 text-[12px] text-slate-500 tabular-nums'
              >
                {item.created}
              </td>
              <td data-l={t('Status')} className='px-3 py-2'>
                <StatusBadge
                  tone={item.enabled ? 'ok' : 'off'}
                  label={item.enabled ? t('Enabled') : t('Disabled')}
                />
              </td>
              <td data-l='' className='px-3 py-2 text-right'>
                <span className='text-[11.5px] font-semibold text-blue-700 dark:text-blue-400'>
                  {item.enabled ? t('Disable') : t('Restore')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className='border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400 dark:border-slate-800'>
        {t(
          'A key is shown in full only once · Demo environment, keys are placeholders'
        )}
      </p>
    </div>
  )
}

function LogsPanel() {
  const { t } = useTranslation()
  return (
    <div className='overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'>
      <div className='flex items-center justify-between gap-2 px-4 py-3'>
        <h3 className='text-[13px] font-bold text-slate-900 dark:text-slate-100'>
          {t('Recent usage logs')}
        </h3>
        <span className='text-[11px] text-slate-400'>
          {t('Latest 20 entries only, export for full history')}
        </span>
      </div>
      <table className='w-full table-fixed border-collapse text-left'>
        <colgroup>
          <col style={{ width: '16%' }} />
          <col style={{ width: '33%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '16%' }} />
        </colgroup>
        <thead>
          <tr className='bg-slate-50 dark:bg-slate-800/60'>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Time')}
            </th>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Model')}
            </th>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Tokens')}
            </th>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Latency')}
            </th>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Status')}
            </th>
          </tr>
        </thead>
        <tbody>
          {DEMO_LOGS.map((item) => (
            <tr
              key={`${item.time}-${item.model}`}
              className='border-t border-slate-100 dark:border-slate-800'
            >
              <td
                data-l={t('Time')}
                className='px-3 py-2 text-[12px] text-slate-500 tabular-nums'
              >
                {item.time}
              </td>
              <td
                data-l={t('Model')}
                className='truncate px-3 py-2 font-mono text-[11.5px] text-slate-600 dark:text-slate-300'
              >
                {item.model}
              </td>
              <td
                data-l={t('Tokens')}
                className='px-3 py-2 text-[12px] text-slate-500 tabular-nums'
              >
                {item.tokens.toLocaleString()}
              </td>
              <td
                data-l={t('Latency')}
                className='px-3 py-2 text-[12px] text-slate-500 tabular-nums'
              >
                {item.latency}
              </td>
              <td data-l={t('Status')} className='px-3 py-2'>
                <StatusBadge
                  tone={item.status === 'ok' ? 'ok' : 'warn'}
                  label={item.status === 'ok' ? t('Success') : t('Throttled')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BillsPanel() {
  const { t } = useTranslation()
  return (
    <div className='overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'>
      <div className='px-4 py-3'>
        <h3 className='text-[13px] font-bold text-slate-900 dark:text-slate-100'>
          {t('Billing history')}
        </h3>
      </div>
      <table className='w-full table-fixed border-collapse text-left'>
        <colgroup>
          <col style={{ width: '26%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '26%' }} />
          <col style={{ width: '26%' }} />
        </colgroup>
        <thead>
          <tr className='bg-slate-50 dark:bg-slate-800/60'>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Date')}
            </th>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Type')}
            </th>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Amount')}
            </th>
            <th className='px-3 py-2 text-[11.5px] font-medium whitespace-nowrap text-slate-500'>
              {t('Balance')}
            </th>
          </tr>
        </thead>
        <tbody>
          {DEMO_BILLS.map((item) => (
            <tr
              key={`${item.date}-${item.amount}`}
              className='border-t border-slate-100 dark:border-slate-800'
            >
              <td
                data-l={t('Date')}
                className='px-3 py-2 text-[12px] text-slate-500 tabular-nums'
              >
                {item.date}
              </td>
              <td data-l={t('Type')} className='px-3 py-2'>
                <StatusBadge
                  tone={item.type === 'topup' ? 'ok' : 'off'}
                  label={item.type === 'topup' ? t('Top up') : t('Charge')}
                />
              </td>
              <td
                data-l={t('Amount')}
                className='px-3 py-2 text-[12px] font-semibold text-slate-700 tabular-nums dark:text-slate-200'
              >
                {item.amount}
              </td>
              <td
                data-l={t('Balance')}
                className='px-3 py-2 text-[12px] text-slate-500 tabular-nums'
              >
                {item.balance}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className='border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400 dark:border-slate-800'>
        {t('Corporate transfers are credited within one business day')}
      </p>
    </div>
  )
}

export function ShowcaseConsole({ initialTab }: { initialTab?: ConsoleTab }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ConsoleTab>(initialTab ?? 'overview')
  const { isAuthenticated } = useConsoleData()

  const tabs: Array<{ key: ConsoleTab; label: string }> = [
    { key: 'overview', label: t('Overview') },
    { key: 'keys', label: t('API keys') },
    { key: 'logs', label: t('Usage logs') },
    { key: 'bills', label: t('Billing') },
  ]

  return (
    <ShowcaseShell>
      <div className='mx-auto w-full max-w-7xl px-4 pt-9 pb-16 md:px-6'>
        <p className='text-xs font-semibold text-blue-700 dark:text-blue-400'>
          {t('Console · Account and usage')}
        </p>
        <h1 className='mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl dark:text-slate-100'>
          {t('Console')}
        </h1>
        <p className='mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400'>
          {isAuthenticated
            ? t(
                'Balance, keys, usage logs and top-ups below are read live from your account.'
              )
            : t(
                'A preview of the account console. Figures below are demo data; sign in to see your real balance, keys and logs.'
              )}
        </p>

        {!isAuthenticated && (
          <div className='mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10'>
            <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'>
              {t('Demo data')}
            </span>
            <p className='min-w-0 flex-1 text-[12.5px] text-slate-600 dark:text-slate-300'>
              {t(
                'These tables are illustrative. Sign in to switch every panel to your own account data.'
              )}
            </p>
            <Link
              to='/sign-in'
              search={{ redirect: '/console-preview' }}
              className='inline-flex h-8 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold whitespace-nowrap text-white hover:bg-blue-700'
            >
              {t('Sign in / Sign up')}
            </Link>
          </div>
        )}

        <div className='mt-5 flex flex-wrap items-center gap-1.5'>
          <div
            role='tablist'
            aria-label={t('Console sections')}
            className='flex flex-wrap gap-1.5'
          >
            {tabs.map((item) => (
              <button
                key={item.key}
                type='button'
                role='tab'
                aria-selected={tab === item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  'inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
                  tab === item.key
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Link
            to={isAuthenticated ? '/dashboard' : '/sign-in'}
            search={
              isAuthenticated ? undefined : { redirect: '/console-preview' }
            }
            className='ml-auto inline-flex h-9 items-center rounded-lg border border-slate-300 px-3 text-[12.5px] font-semibold text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:text-slate-200'
          >
            {isAuthenticated ? t('Open real console') : t('Sign in')}
          </Link>
        </div>

        <div className='mt-4'>
          {tab === 'overview' &&
            (isAuthenticated ? <LiveOverviewPanel /> : <OverviewPanel />)}
          {tab === 'keys' &&
            (isAuthenticated ? <LiveKeysPanel /> : <KeysPanel />)}
          {tab === 'logs' &&
            (isAuthenticated ? <LiveLogsPanel /> : <LogsPanel />)}
          {tab === 'bills' &&
            (isAuthenticated ? <LiveBillsPanel /> : <BillsPanel />)}
        </div>
      </div>
    </ShowcaseShell>
  )
}
