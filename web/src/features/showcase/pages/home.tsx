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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { HeroOrbit } from '../components/hero-orbit'
import { ShowcaseShell } from '../components/showcase-shell'
import {
  useShowcaseModels,
  type ShowcaseModel,
} from '../hooks/use-showcase-models'
import { SHOWCASE_ROUTES, MODEL_KIND_LABELS } from '../lib/showcase-nav'
import { formatPricePerMillion } from '../lib/showcase-pricing'

function useBaseUrl() {
  return useMemo(() => {
    if (typeof window === 'undefined') return '/v1'
    return `${window.location.origin}/v1`
  }, [])
}

/** Flagship families called out in the hero copy, most recognisable first. */
const POPULAR_ORDER = [
  'deepseek',
  'kimi',
  'moonshot',
  'glm',
  'qwen',
  'doubao',
  'claude',
  'gpt',
  'gemini',
  'grok',
]

function popularityRank(name: string): number {
  const lower = name.toLowerCase()
  const index = POPULAR_ORDER.findIndex((prefix) => lower.includes(prefix))
  return index === -1 ? POPULAR_ORDER.length : index
}

function pickFeatured(models: ShowcaseModel[]): ShowcaseModel[] {
  // Names prefixed with `@` are proxy host aliases (e.g. `@hf/...`); they are
  // the same model behind a mirror and read poorly on a marketing surface.
  const clean = models.filter((model) => !model.name.startsWith('@'))
  const pool = clean.length >= 5 ? clean : models

  return [...pool]
    .sort((a, b) => {
      const rank = popularityRank(a.name) - popularityRank(b.name)
      if (rank !== 0) return rank
      return a.platformInput - b.platformInput
    })
    .slice(0, 5)
}

function CountUp({
  value,
  decimals = 0,
  suffix = '',
}: {
  value: number
  decimals?: number
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  const [display, setDisplay] = useState(0)
  const target = Number.isFinite(value) ? value : 0

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // The catalogue arrives after the first paint, so every `target` change
    // has to be able to replay the count-up from its new value.
    started.current = false

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      setDisplay(target)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || started.current) continue
          started.current = true
          const duration = 900
          const start = performance.now()
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplay(target * eased)
            if (progress < 1) {
              requestAnimationFrame(tick)
            } else {
              setDisplay(target)
            }
          }
          requestAnimationFrame(tick)
        }
      },
      // Chrome rejects units mixed with bare zeroes, so keep everything in px.
      { rootMargin: '0px 0px -48px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref} className='tabular-nums'>
      {(Number.isFinite(display) ? display : 0).toFixed(decimals)}
      {suffix}
    </span>
  )
}

function HeroSection() {
  const { t } = useTranslation()
  const { models, isLoading } = useShowcaseModels()
  const baseUrl = useBaseUrl()
  const featured = useMemo(() => pickFeatured(models), [models])

  const copyBaseUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(baseUrl)
      toast.success(t('base_url copied'))
    } catch {
      toast.error(t('Copy failed, please copy manually'))
    }
  }, [baseUrl, t])

  return (
    <section className='relative isolate overflow-hidden bg-[linear-gradient(180deg,#f6f9ff_0%,#fbfdff_68%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#0b1220_0%,#0d1526_68%,#0f172a_100%)]'>
      {/* 40px grid backdrop */}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(31,111,235,0.075)_1px,transparent_1px),linear-gradient(to_bottom,rgba(31,111,235,0.075)_1px,transparent_1px)] [mask-image:radial-gradient(130%_100%_at_50%_0%,#000_34%,transparent_82%)] bg-[size:40px_40px]'
      />
      {/* Aurora blobs */}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 z-0 overflow-hidden'
      >
        <span className='absolute -top-24 left-[8%] size-[420px] rounded-full bg-blue-400/25 blur-[62px]' />
        <span className='absolute top-[18%] right-[6%] size-[380px] rounded-full bg-violet-400/20 blur-[62px]' />
        <span className='absolute bottom-[-12%] left-[38%] hidden size-[360px] rounded-full bg-sky-300/20 blur-[62px] md:block' />
      </div>

      <HeroOrbit className='pointer-events-none absolute bottom-[42px] left-[8.54%] z-[1] hidden h-[499px] w-[499px] opacity-70 lg:block' />

      <div className='relative z-[2] mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pt-16 pb-24 md:px-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-[46px] lg:pt-20 lg:pb-24'>
        <div className='relative'>
          <p className='inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'>
            {t('OpenAI-compatible API · Credits never expire')}
          </p>
          <h1 className='mt-4 text-4xl leading-[1.12] font-extrabold tracking-tight text-slate-900 md:text-5xl dark:text-slate-100'>
            {t('One Key,')}
            <br />
            <em className='showcase-sheen bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600 bg-[length:220%_100%] bg-clip-text text-transparent not-italic'>
              {t('every flagship model')}
            </em>
          </h1>
          <p className='mt-4 max-w-[34em] text-[15.5px] leading-relaxed text-slate-600 dark:text-slate-400'>
            {t(
              'DeepSeek, Kimi, GLM, Qwen, Doubao and more behind a single endpoint. No separate accounts, no separate integrations — switching models is one parameter away.'
            )}
          </p>
          <div className='mt-7 flex flex-wrap items-center gap-3'>
            <Link
              to={SHOWCASE_ROUTES.trial}
              className='inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(31,111,235,0.9)] transition hover:bg-blue-700'
            >
              {t('Try online')}
              <svg
                aria-hidden='true'
                className='size-4'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                viewBox='0 0 24 24'
              >
                <path
                  d='M5 12h14M13 6l6 6-6 6'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </Link>
            <Link
              to={SHOWCASE_ROUTES.market}
              className='inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500'
            >
              {t('Browse models')}
            </Link>
          </div>
        </div>

        <div className='relative rounded-2xl border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.09)] dark:border-slate-800 dark:bg-slate-900'>
          <span
            aria-hidden='true'
            className='pointer-events-none absolute top-0 left-0 size-5 rounded-tl-2xl border-t-2 border-l-2 border-blue-500/40'
          />
          <span
            aria-hidden='true'
            className='pointer-events-none absolute right-0 bottom-0 size-5 rounded-br-2xl border-r-2 border-b-2 border-blue-500/40'
          />
          <div className='px-4 pt-3 pb-2.5'>
            <h2 className='text-[15.5px] font-extrabold text-slate-900 dark:text-slate-100'>
              {t('Popular models')}
            </h2>
          </div>

          <div className='border-t border-slate-100 dark:border-slate-800'>
            {isLoading && (
              <div className='px-4 py-8 text-center text-sm text-slate-400'>
                {t('Loading...')}
              </div>
            )}
            {!isLoading && featured.length === 0 && (
              <div className='px-4 py-8 text-center text-sm text-slate-400'>
                {t('No models available')}
              </div>
            )}
            {featured.map((model) => (
              <Link
                key={model.id}
                to={SHOWCASE_ROUTES.trial}
                search={{ model: model.name }}
                className='group grid grid-cols-[30px_minmax(0,1fr)_auto_52px] items-center gap-2.5 border-t border-slate-100 px-3.5 py-2.5 transition-colors first:border-t-0 hover:bg-slate-50 max-[400px]:grid-cols-[28px_1fr_52px] dark:border-slate-800 dark:hover:bg-slate-800/60'
              >
                <span
                  className={cn(
                    'flex size-[30px] items-center justify-center rounded-lg text-[11px] font-bold',
                    model.tone
                  )}
                >
                  {model.initials.slice(0, 1)}
                </span>
                <span className='min-w-0'>
                  <b className='block truncate text-[13px] font-bold text-slate-900 dark:text-slate-100'>
                    {model.name}
                  </b>
                  <i className='block truncate text-[11px] font-normal text-slate-500 not-italic dark:text-slate-400'>
                    {model.vendor} ·{' '}
                    {t(MODEL_KIND_LABELS[model.kind] ?? 'Text')}
                  </i>
                </span>
                <span className='text-[13px] font-bold text-blue-700 max-[400px]:hidden dark:text-blue-400'>
                  {model.free
                    ? t('Free of charge')
                    : formatPricePerMillion(model.platformInput)}
                  {!model.free && (
                    <small className='ml-0.5 text-[10px] font-medium text-slate-400'>
                      {model.perRequest ? t('/call') : '/M'}
                    </small>
                  )}
                </span>
                <span className='justify-self-end rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 transition-colors group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-500/15 dark:text-violet-300'>
                  {t('Try')}
                </span>
              </Link>
            ))}
          </div>

          <div className='flex flex-wrap items-center gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/80 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/60'>
            <code className='min-w-0 flex-1 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400'>
              base_url = &quot;{baseUrl}&quot;
            </code>
            <button
              type='button'
              onClick={copyBaseUrl}
              className='rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            >
              {t('Copy')}
            </button>
            <Link
              to={SHOWCASE_ROUTES.market}
              className='text-[11px] font-semibold text-blue-700 hover:underline dark:text-blue-400'
            >
              {t('View all models')} →
            </Link>
          </div>
        </div>
      </div>

      <div
        aria-hidden='true'
        className='absolute inset-x-0 bottom-0 z-[3] h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent'
      />
    </section>
  )
}

function StatsSection() {
  const { t } = useTranslation()
  const { stats } = useShowcaseModels()

  const items = [
    {
      value: stats.modelCount,
      decimals: 0,
      suffix: '',
      label: t('Models available'),
    },
    {
      value: stats.vendorCount,
      decimals: 0,
      suffix: '',
      label: t('Vendors covered'),
    },
    {
      value: stats.kindCount,
      decimals: 0,
      suffix: '',
      label: t('Model types'),
    },
    {
      value: stats.freeCount,
      decimals: 0,
      suffix: '',
      label: t('Free models'),
    },
  ]

  return (
    <section className='mx-auto w-full max-w-7xl px-4 md:px-6'>
      <dl className='grid grid-cols-2 gap-4 border-t border-slate-200 py-6 md:grid-cols-4 md:gap-6 dark:border-slate-800'>
        {items.map((item) => (
          <div key={item.label}>
            <dd className='text-[clamp(22px,4.6vw,30px)] font-extrabold tracking-tight text-slate-900 dark:text-slate-100'>
              <CountUp
                decimals={item.decimals}
                suffix={item.suffix}
                value={item.value}
              />
            </dd>
            <dt className='mt-1 text-xs font-medium text-slate-500 dark:text-slate-400'>
              {item.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function ShowcaseHome() {
  return (
    <ShowcaseShell>
      <HeroSection />
      <StatsSection />
    </ShowcaseShell>
  )
}
