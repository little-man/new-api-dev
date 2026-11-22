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
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ShowcaseShell } from '../components/showcase-shell'

export function ShowcaseEnterprise() {
  const { t } = useTranslation()
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = (key: string) => String(data.get(key) ?? '').trim()
    // There is no lead/ticket endpoint behind this storefront, so instead of
    // pretending a proposal was sent we hand the visitor a ready-to-send
    // summary of their own input.
    const summary = [
      `${t('Company name')}: ${field('company')}`,
      `${t('Contact name')}: ${field('name')}`,
      `${t('Work email')}: ${field('email')}`,
      `${t('Estimated monthly usage')}: ${field('volume') || '-'}`,
      `${t('Requirements')}: ${field('need') || '-'}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(summary)
      toast.success(
        t(
          'Requirement summary copied. Send it to our sales team — no ticket system is connected to this form yet.'
        )
      )
      formRef.current?.reset()
    } catch {
      toast.error(t('Copy failed, please copy manually'))
    }
  }

  const cards = [
    {
      title: t('Corporate transfer'),
      body: t(
        'Pay between corporate accounts, settle in stages per contract, and reconcile with your existing finance workflow.'
      ),
    },
    {
      title: t('Compliant invoices'),
      body: t(
        'Issue standard or special VAT invoices whose amount always matches the usage statement.'
      ),
    },
    {
      title: t('Members and permissions'),
      body: t(
        'Sub-accounts, member quotas, allowed models and access audits, all managed under one master account.'
      ),
    },
    {
      title: t('Usage and budget'),
      body: t(
        'Split billing by project, department or member, with a monthly usage dashboard and budget alerts.'
      ),
    },
  ]

  const points = [
    t(
      'Monthly settlement or prepaid balance, whichever fits your procurement process.'
    ),
    t('Optional SLA with latency and availability commitments.'),
    t('Private gateway and IP allowlists for regulated environments.'),
  ]

  return (
    <ShowcaseShell>
      <div className='mx-auto w-full max-w-7xl px-4 pt-9 pb-16 md:px-6'>
        <p className='text-xs font-semibold text-blue-700 dark:text-blue-400'>
          {t('Corporate procurement · Compliant invoicing · SLA')}
        </p>
        <h1 className='mt-2 max-w-3xl text-3xl leading-tight font-extrabold tracking-tight text-slate-900 md:text-4xl dark:text-slate-100'>
          {t('Enterprise token procurement')}
          <br />
          {t('and team usage management')}
        </h1>
        <p className='mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400'>
          {t(
            'Built for teams that need unified purchasing, invoicing and access control. Start with a trial, then sign a quarterly or annual procurement agreement.'
          )}
        </p>

        <div className='mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          {cards.map((card) => (
            <div
              key={card.title}
              className='rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
            >
              <h2 className='text-sm font-bold text-slate-900 dark:text-slate-100'>
                {card.title}
              </h2>
              <p className='mt-2 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400'>
                {card.body}
              </p>
            </div>
          ))}
        </div>

        <div className='mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
          <div>
            <h2 className='text-lg font-bold text-slate-900 dark:text-slate-100'>
              {t('Why teams move to a unified gateway')}
            </h2>
            <ul className='mt-3 space-y-2.5'>
              {points.map((point) => (
                <li
                  key={point}
                  className='flex gap-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400'
                >
                  <span className='mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-600' />
                  {point}
                </li>
              ))}
            </ul>
            <p className='mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-slate-500 dark:bg-slate-800/50 dark:text-slate-400'>
              {t(
                'Commercial details, invoice type and settlement terms are confirmed with our sales team.'
              )}
            </p>
          </div>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className='rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900'
          >
            <h2 className='text-lg font-bold text-slate-900 dark:text-slate-100'>
              {t('Talk to us')}
            </h2>

            <div className='mt-4 grid gap-3 sm:grid-cols-2'>
              <label className='block'>
                <span className='mb-1 block text-[11.5px] font-medium text-slate-500 dark:text-slate-400'>
                  {t('Company name')} *
                </span>
                <input
                  required
                  name='company'
                  autoComplete='organization'
                  className='h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100'
                />
              </label>
              <label className='block'>
                <span className='mb-1 block text-[11.5px] font-medium text-slate-500 dark:text-slate-400'>
                  {t('Contact name')} *
                </span>
                <input
                  required
                  name='name'
                  autoComplete='name'
                  className='h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100'
                />
              </label>
              <label className='block'>
                <span className='mb-1 block text-[11.5px] font-medium text-slate-500 dark:text-slate-400'>
                  {t('Work email')} *
                </span>
                <input
                  required
                  type='email'
                  name='email'
                  autoComplete='email'
                  className='h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100'
                />
              </label>
              <label className='block'>
                <span className='mb-1 block text-[11.5px] font-medium text-slate-500 dark:text-slate-400'>
                  {t('Estimated monthly usage')}
                </span>
                <input
                  name='volume'
                  placeholder={t('e.g. 50M tokens per month')}
                  className='h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100'
                />
              </label>
            </div>

            <label className='mt-3 block'>
              <span className='mb-1 block text-[11.5px] font-medium text-slate-500 dark:text-slate-400'>
                {t('Requirements')}
              </span>
              <textarea
                name='need'
                rows={4}
                placeholder={t(
                  'Settlement terms, invoice type, whether an SLA is required, etc.'
                )}
                className='w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100'
              />
            </label>

            <div className='mt-4 flex flex-wrap items-center gap-3'>
              <button
                type='submit'
                className='inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700'
              >
                {t('Copy requirement summary')}
              </button>
              <p className='text-[11px] text-slate-400'>
                {t(
                  'Your input is only formatted and copied locally; nothing is uploaded to a server.'
                )}
              </p>
            </div>
          </form>
        </div>
      </div>
    </ShowcaseShell>
  )
}
