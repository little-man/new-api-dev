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
import {
  ArrowRight,
  BarChart3,
  Boxes,
  KeyRound,
  Plus,
  ShieldCheck,
  Terminal,
  WalletCards,
  Zap,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getUptimeStatus } from '@/features/dashboard/api'
import { useStatus } from '@/hooks/use-status'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useSignInDialogStore } from '@/stores/sign-in-dialog-store'

import { HeroOrbit } from '../components/hero-orbit'
import { ShowcaseShell } from '../components/showcase-shell'
import {
  useShowcaseModels,
  type ShowcaseModel,
} from '../hooks/use-showcase-models'
import { SHOWCASE_ROUTES, MODEL_KIND_LABELS } from '../lib/showcase-nav'
import { formatPricePerMillion } from '../lib/showcase-pricing'
import {
  SNIPPET_LANG_LABELS,
  buildSnippet,
  resolveSnippetTargets,
  type SnippetLang,
} from '../lib/quickstart-snippets'

/**
 * Base URL advertised by the gateway. Admins can pin it in system settings;
 * without that the current browser origin is the only address we can trust.
 */
function useBaseUrl() {
  const { status } = useStatus()
  return useMemo(() => {
    const configured =
      typeof status?.server_address === 'string'
        ? status.server_address.trim().replace(/\/+$/, '')
        : ''
    if (!configured) {
      if (typeof window === 'undefined') return '/v1'
      return `${window.location.origin}/v1`
    }
    return configured.endsWith('/v1') ? configured : `${configured}/v1`
  }, [status?.server_address])
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

function pickFeatured(models: ShowcaseModel[], count: number) {
  // Names prefixed with `@` are proxy host aliases (e.g. `@hf/...`); they are
  // the same model behind a mirror and read poorly on a marketing surface.
  const clean = models.filter((model) => !model.name.startsWith('@'))
  const pool = clean.length >= count ? clean : models

  return [...pool]
    .sort((a, b) => {
      const rank = popularityRank(a.name) - popularityRank(b.name)
      if (rank !== 0) return rank
      return a.platformInput - b.platformInput
    })
    .slice(0, count)
}

/** Upper bound (USD per 1M input tokens) for the "low price" filter chip. */
const LOW_PRICE_THRESHOLD = 1

function isCodingModel(model: ShowcaseModel): boolean {
  const name = model.name.toLowerCase()
  return (
    name.includes('coder') ||
    name.includes('code') ||
    model.tags.some((tag) => /code|编程/i.test(tag))
  )
}

function isLowPriceModel(model: ShowcaseModel): boolean {
  return model.free || model.platformInput <= LOW_PRICE_THRESHOLD
}

/* Storefront constants (spec B6): no backend source exists for these yet. */
const REFERENCE_LATENCY_MS = 32
const REFERENCE_DEVELOPERS = 3000
const REFERENCE_UPTIME = 99.9

const ECO_TOOLS: { name: string; color: string }[] = [
  { name: 'Cherry Studio', color: '#1f6feb' },
  { name: 'OpenAI SDK', color: '#7c3aed' },
  { name: 'Claude Code', color: '#0b3d91' },
  { name: 'Gemini CLI', color: '#374151' },
  { name: 'One API', color: '#6b7280' },
  { name: 'LobeChat', color: '#f97316' },
  { name: 'New API', color: '#059669' },
  { name: 'Dify', color: '#1553c4' },
]

const FALLBACK_VENDORS: { name: string; color: string }[] = [
  { name: 'DeepSeek', color: '#f97316' },
  { name: 'Kimi', color: '#1f6feb' },
  { name: 'GLM', color: '#7c3aed' },
  { name: 'Qwen', color: '#0b3d91' },
  { name: 'Doubao', color: '#374151' },
  { name: 'Kling', color: '#6b7280' },
  { name: 'MiniMax', color: '#059669' },
  { name: 'Llama', color: '#f43f5e' },
  { name: 'Mistral', color: '#1553c4' },
]

const VENDOR_COLORS = [
  '#f97316',
  '#1f6feb',
  '#7c3aed',
  '#0b3d91',
  '#374151',
  '#059669',
  '#f43f5e',
  '#1553c4',
]

const CODE_LANGS: SnippetLang[] = ['curl', 'python', 'javascript']

const SECTION_CONTAINER =
  'mx-auto w-full max-w-[1180px] px-[18px] md:px-7'

function CountUp(props: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  const [display, setDisplay] = useState(0)
  const target = Number.isFinite(props.value) ? props.value : 0
  const decimals = props.decimals ?? 0
  const suffix = props.suffix ?? ''

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
          const duration = 1400
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

/** Scroll-into-view fade used by every storefront section below the hero. */
function Reveal(props: { children: ReactNode; className?: string; delay?: number }) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce) {
    return <div className={props.className}>{props.children}</div>
  }
  return (
    <motion.div
      className={props.className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{
        duration: 0.65,
        ease: [0.2, 0.7, 0.2, 1],
        delay: props.delay ?? 0,
      }}
    >
      {props.children}
    </motion.div>
  )
}

function SectionHead(props: { eyebrow: string; title: string; lead: string }) {
  return (
    <div className='mb-6 max-w-[36em]'>
      <span className='inline-flex items-center gap-1.5 rounded-full bg-[#eef4ff] px-2.5 py-1 text-[12.5px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'>
        {props.eyebrow}
      </span>
      <h2 className='mt-3 text-[clamp(22px,2.6vw,28px)] leading-[1.3] font-bold tracking-[-0.01em] text-slate-900 dark:text-slate-100'>
        {props.title}
      </h2>
      <p className='mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400'>
        {props.lead}
      </p>
    </div>
  )
}

type ModelFilter = 'all' | 'text' | 'code' | 'low'

const MODEL_FILTERS: ModelFilter[] = ['all', 'text', 'code', 'low']

function HeroSection() {
  const { t } = useTranslation()
  const { models, isLoading } = useShowcaseModels()
  const baseUrl = useBaseUrl()
  const [filter, setFilter] = useState<ModelFilter>('all')

  const featured = useMemo(() => pickFeatured(models, 12), [models])
  const rows = useMemo(() => {
    let pool = featured
    if (filter === 'text') {
      pool = featured.filter((m) => m.kind === 'text' || m.kind === 'vision')
    } else if (filter === 'code') {
      pool = featured.filter(isCodingModel)
    } else if (filter === 'low') {
      pool = featured.filter(isLowPriceModel)
    }
    // Keep a stable six-row panel; fall back to the unfiltered list when a
    // filter leaves fewer rows so the card never collapses.
    const fillers = featured.filter((m) => !pool.includes(m))
    return [...pool, ...fillers].slice(0, 6)
  }, [featured, filter])

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

      <div className={cn(SECTION_CONTAINER, 'relative z-[2] grid items-center gap-8 pt-11 pb-[118px] lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-[46px] lg:pt-16 lg:pb-24')}>
        <div className='relative'>
          <p className='inline-flex items-center rounded-full bg-[#eef4ff] px-3 py-1 text-[12.5px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'>
            {t('OpenAI-compatible API · Credits never expire')}
          </p>
          <h1 className='mt-4 text-[clamp(30px,3.6vw,42px)] leading-[1.18] font-extrabold tracking-[-0.02em] text-slate-900 dark:text-slate-100'>
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
              className='tb-gradient-btn inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-[15px] font-semibold'
            >
              <span>{t('Try online')}</span>
              <ArrowRight className='size-4' strokeWidth={2} aria-hidden='true' />
            </Link>
            <Link
              to={SHOWCASE_ROUTES.market}
              className='inline-flex h-11 items-center rounded-[10px] border border-slate-200 bg-white px-5 text-[15px] font-semibold text-slate-800 transition hover:-translate-y-px hover:border-[#c9d3e3] hover:shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500'
            >
              {t('Browse models')}
            </Link>
          </div>
        </div>

        <Reveal>
          <div className='relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_18px_48px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-900'>
            <div className='flex flex-wrap items-center gap-2.5 px-[18px] pt-4 pb-2.5'>
              <span
                aria-hidden='true'
                className='size-2 shrink-0 rounded-full bg-[linear-gradient(135deg,#f97316,#f43f5e)] shadow-[0_0_10px_rgba(249,115,22,0.55)]'
              />
              <h2 className='text-[15.5px] font-bold text-slate-900 dark:text-slate-100'>
                {t('Popular models')}
              </h2>
              <div
                role='group'
                aria-label={t('Model filters')}
                className='ml-auto flex flex-wrap gap-1.5'
              >
                {MODEL_FILTERS.map((key) => (
                  <button
                    key={key}
                    type='button'
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      'rounded-full border px-2.5 py-[3.5px] text-xs font-semibold transition-colors',
                      filter === key
                        ? 'border-blue-600 bg-blue-600 text-white shadow-[0_3px_10px_rgba(31,111,235,0.3)]'
                        : 'border-slate-200 bg-[#fbfcfe] text-slate-500 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                    )}
                  >
                    {t(MODEL_FILTER_LABELS[key])}
                  </button>
                ))}
              </div>
            </div>

            <div className='flex flex-col'>
              {isLoading && (
                <div className='px-[18px] py-8 text-center text-sm text-slate-400'>
                  {t('Loading...')}
                </div>
              )}
              {!isLoading && rows.length === 0 && (
                <div className='px-[18px] py-8 text-center text-sm text-slate-400'>
                  {t('No models available')}
                </div>
              )}
              {rows.map((model) => (
                <Link
                  key={model.id}
                  to={SHOWCASE_ROUTES.trial}
                  search={{ model: model.name }}
                  className='group grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 border-t border-slate-100 px-[18px] py-3 transition-colors first:border-t-0 hover:bg-[#f6f9ff] dark:border-slate-800 dark:hover:bg-slate-800/60'
                >
                  <span
                    className={cn(
                      'flex size-[38px] items-center justify-center rounded-[11px] text-[15px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
                      model.tone
                    )}
                  >
                    {model.initials.slice(0, 1)}
                  </span>
                  <span className='min-w-0'>
                    <span className='flex min-w-0 items-center gap-1.5 font-mono text-sm font-semibold tracking-[-0.02em] text-slate-900 dark:text-slate-100'>
                      <span className='truncate'>{model.name}</span>
                      {model.free && (
                        <span className='shrink-0 rounded-[5px] border border-[#ffdcc3] bg-[#fff3e8] px-1.5 py-px font-sans text-[10.5px] font-semibold text-[#c2410c]'>
                          {t('Free of charge')}
                        </span>
                      )}
                    </span>
                    <span className='block truncate text-[12.5px] text-slate-500 dark:text-slate-400'>
                      {model.vendor} · {t(MODEL_KIND_LABELS[model.kind] ?? 'Text')}
                    </span>
                  </span>
                  <span className='flex items-center gap-3'>
                    <span className='whitespace-nowrap text-[14.5px] font-bold text-blue-700 dark:text-blue-400'>
                      {model.free
                        ? t('Free of charge')
                        : formatPricePerMillion(model.platformInput)}
                      {!model.free && (
                        <small className='text-[11.5px] font-medium text-slate-500'>
                          {model.perRequest ? t('/call') : '/M'}
                        </small>
                      )}
                    </span>
                    <span className='whitespace-nowrap rounded-lg border border-[#cfe0fa] bg-[#f4f8ff] px-2.5 py-1 text-[12.5px] font-semibold text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'>
                      {t('Try')}
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            <div className='flex flex-wrap items-center gap-2.5 border-t border-[#f2f4f8] bg-[#fbfcfe] px-[18px] py-3 dark:border-slate-800 dark:bg-slate-900/60'>
              <code className='min-w-0 flex-1 truncate font-mono text-xs text-slate-600 dark:text-slate-400'>
                base_url = &quot;{baseUrl}&quot;
              </code>
              <CopyButton
                value={baseUrl}
                variant='outline'
                size='sm'
                className='h-7 rounded-lg px-2.5 text-[12.5px] text-slate-600'
              >
                {t('Copy')}
              </CopyButton>
              <Link
                to={SHOWCASE_ROUTES.market}
                className='whitespace-nowrap text-[13.5px] font-semibold text-blue-700 hover:underline dark:text-blue-400'
              >
                {t('View all models')} <span aria-hidden='true'>→</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const MODEL_FILTER_LABELS: Record<ModelFilter, string> = {
  all: 'All',
  text: 'Text',
  code: 'Coding',
  low: 'Low price',
}

function StatsBar() {
  const { t } = useTranslation()
  const { stats } = useShowcaseModels()
  const uptimeQuery = useQuery({
    queryKey: ['showcase', 'uptime-status'],
    queryFn: async () => requireServerSuccess(await getUptimeStatus()),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const uptime = useMemo(() => {
    const monitors = uptimeQuery.data?.data?.flatMap((group) => group.monitors) ?? []
    if (monitors.length === 0) return REFERENCE_UPTIME
    const total = monitors.reduce((sum, monitor) => sum + (Number(monitor.uptime) || 0) * 100, 0)
    return total / monitors.length
  }, [uptimeQuery.data])

  const items = [
    { value: stats.modelCount, decimals: 0, suffix: '', label: t('Models available') },
    { value: uptime, decimals: 1, suffix: '%', label: t('Service availability') },
    { value: REFERENCE_LATENCY_MS, decimals: 0, suffix: 'ms', label: t('Avg. first-token latency') },
    { value: REFERENCE_DEVELOPERS, decimals: 0, suffix: '+', label: t('Developers and teams') },
  ]

  return (
    <section className='border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40'>
      <dl className={cn(SECTION_CONTAINER, 'grid grid-cols-2 gap-x-3 gap-y-[18px] py-[26px] min-[720px]:grid-cols-4 min-[720px]:gap-0 min-[720px]:pt-[30px]')}>
        {items.map((item) => (
          <div
            key={item.label}
            className='flex min-[720px]:flex-col min-[720px]:border-l min-[720px]:border-slate-200 min-[720px]:pl-7 first:min-[720px]:border-l-0 first:min-[720px]:pl-0 dark:min-[720px]:border-slate-800'
          >
            <dd className='tb-stat-num'>
              <CountUp decimals={item.decimals} suffix={item.suffix} value={item.value} />
            </dd>
            <dt className='text-[12.5px] text-slate-500 dark:text-slate-400'>{item.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}

function MarqueeRow(props: { items: { name: string; color: string }[]; reverse?: boolean }) {
  return (
    <div className='tb-marquee'>
      <div className='tb-marquee-track' data-direction={props.reverse ? 'reverse' : undefined}>
        {/* The track is translated by -50%, so every chip is rendered twice. */}
        {props.items.map((item) => (
          <div key={item.name} className='flex shrink-0 gap-2.5'>
            <MarqueeChip item={item} />
            <MarqueeChip item={item} duplicate />
          </div>
        ))}
      </div>
    </div>
  )
}

function MarqueeChip(props: { item: { name: string; color: string }; duplicate?: boolean }) {
  return (
    <span
      aria-hidden={props.duplicate || undefined}
      className='inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3.5 py-2 text-[13.5px] whitespace-nowrap text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-[#cfe0fa] hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-blue-400'
    >
      <i
        className='tb-gradient-icon size-[22px] rounded-[7px] text-[11px] font-bold'
        style={{ background: props.item.color }}
      >
        {props.item.name.slice(0, 1)}
      </i>
      {props.item.name}
    </span>
  )
}

function EcosystemSection() {
  const { t } = useTranslation()
  const { vendors } = useShowcaseModels()

  const vendorChips = useMemo(() => {
    const names = vendors
      .map((vendor) => vendor.name.trim())
      .filter((name) => name.length > 0)
      .slice(0, 12)
    if (names.length === 0) return FALLBACK_VENDORS
    return names.map((name, index) => ({ name, color: VENDOR_COLORS[index % VENDOR_COLORS.length] }))
  }, [vendors])

  return (
    <section className={cn(SECTION_CONTAINER, 'py-14 md:py-[72px]')}>
      <Reveal>
        <SectionHead
          eyebrow={t('Compatible ecosystem')}
          title={t('Plug in with mainstream clients and SDKs')}
          lead={t('OpenAI-compatible protocol, so existing tools and code keep working; upstream models keep growing.')}
        />
      </Reveal>
      <Reveal delay={0.08}>
        <p className='mb-2.5 mt-1 text-xs tracking-[0.06em] text-slate-500 before:mr-2 before:inline-block before:h-px before:w-3.5 before:bg-[#c9d3e3] before:align-middle before:content-[""] dark:text-slate-400'>
          {t('Clients and dev tools')}
        </p>
        <MarqueeRow items={ECO_TOOLS} />
        <p className='mb-2.5 mt-[22px] text-xs tracking-[0.06em] text-slate-500 before:mr-2 before:inline-block before:h-px before:w-3.5 before:bg-[#c9d3e3] before:align-middle before:content-[""] dark:text-slate-400'>
          {t('Connected upstream models')}
        </p>
        <MarqueeRow items={vendorChips} reverse />
      </Reveal>
    </section>
  )
}

function CodeSection() {
  const { t } = useTranslation()
  const { models } = useShowcaseModels()
  const baseUrl = useBaseUrl()
  const origin = baseUrl.replace(/\/v1\/?$/, '')

  const demoModel = useMemo(() => {
    const featured = pickFeatured(models, models.length)
    return (
      featured.find((model) => resolveSnippetTargets(model)[0]?.kind === 'chat') ??
      null
    )
  }, [models])
  const snippetTarget = demoModel ? resolveSnippetTargets(demoModel)[0] : undefined
  const [lang, setLang] = useState<SnippetLang>('curl')

  const snippets = useMemo(() => {
    if (!demoModel || !snippetTarget) return null
    const ctx = { baseUrl: origin, modelName: demoModel.name }
    return Object.fromEntries(
      CODE_LANGS.map((lang) => [lang, buildSnippet(lang, snippetTarget, ctx)])
    ) as Record<SnippetLang, string>
  }, [demoModel, origin, snippetTarget])

  const points = [
    { icon: Plus, title: t('Protocol compatible'), text: t('OpenAI-shaped requests and responses, mainstream SDKs work out of the box.') },
    { icon: Terminal, title: t('Unified error codes'), text: t('Rate limits, auth and channel errors share one structure for easier debugging.') },
    { icon: Zap, title: t('Low-latency routing'), text: t('Nearest link and available channel first, less queuing and waiting.') },
  ]

  return (
    <section className='relative mt-2 overflow-hidden bg-[#0b1220] text-[#e6eef9]'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(124,160,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(124,160,255,0.05)_1px,transparent_1px)] [mask-image:radial-gradient(120%_90%_at_70%_10%,#000_20%,transparent_78%)] bg-[size:44px_44px]'
      />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -top-[10%] -right-[6%] h-[380px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(31,111,235,0.4),transparent_70%)] blur-[70px] opacity-50'
      />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -bottom-[8%] -left-[4%] h-[300px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.32),transparent_70%)] blur-[70px] opacity-50'
      />

      <div className={cn(SECTION_CONTAINER, 'relative z-[1] grid items-center gap-[26px] py-14 pb-[60px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 lg:py-[72px] lg:pb-[76px]')}>
        <Reveal>
          <span className='inline-flex items-center rounded-full border border-[rgba(124,160,255,0.25)] bg-[rgba(31,111,235,0.18)] px-2.5 py-1 text-[12.5px] font-semibold text-[#8fbcff]'>
            {t('Integration example')}
          </span>
          <h2 className='mt-3.5 text-[clamp(22px,2.6vw,28px)] leading-[1.3] font-bold tracking-[-0.01em] text-white'>
            {t('One model parameter, switch to any flagship model')}
          </h2>
          <p className='mt-2.5 max-w-[36em] text-sm leading-relaxed text-[#9fb3d1]'>
            {t('Point base_url and your API key at any client or SDK, then chat, complete and call multimodal models over one protocol.')}
          </p>
          <ul className='mt-6 flex flex-col gap-3.5'>
            {points.map((point) => (
              <li key={point.title} className='flex gap-3'>
                <span className='tb-gradient-icon size-[34px] shrink-0 rounded-[10px] border border-[rgba(124,160,255,0.22)] bg-[rgba(124,160,255,0.14)]! text-[#8fbcff]! shadow-none!'>
                  <point.icon className='size-[18px]' strokeWidth={1.8} aria-hidden='true' />
                </span>
                <span>
                  <b className='block text-[14.5px] font-semibold text-white'>{point.title}</b>
                  <span className='mt-0.5 block text-[13.5px] text-[#9fb3d1]'>{point.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.16}>
          <div className='relative overflow-hidden rounded-2xl border border-[rgba(124,160,255,0.18)] bg-[#070d18] shadow-[0_24px_60px_rgba(4,10,22,0.6)]'>
            <Tabs
              value={lang}
              onValueChange={(value) => setLang(value as SnippetLang)}
              className='gap-0'
            >
              <div className='flex items-center gap-2 border-b border-white/7 bg-white/2 px-4 py-[11px]'>
                <span className='size-2.5 rounded-full bg-[#ff5f57]' />
                <span className='size-2.5 rounded-full bg-[#febc2e]' />
                <span className='size-2.5 rounded-full bg-[#28c840]' />
                <TabsList className='ml-3 h-auto bg-transparent p-0 group-data-horizontal/tabs:h-auto'>
                  {CODE_LANGS.map((lang) => (
                    <TabsTrigger
                      key={lang}
                      value={lang}
                      className='h-auto rounded-[7px] border border-white/12 px-2.5 py-1 font-mono text-[11.5px] font-normal text-[#8aa0bd] data-active:border-[rgba(124,160,255,0.4)] data-active:bg-[rgba(124,160,255,0.16)] data-active:text-[#dbe7f6] data-active:shadow-none dark:data-active:border-[rgba(124,160,255,0.4)] dark:data-active:bg-[rgba(124,160,255,0.16)] after:hidden'
                    >
                      {SNIPPET_LANG_LABELS[lang]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {snippets && (
                  <CopyButton
                    value={snippets[lang] ?? ''}
                    variant='outline'
                    size='sm'
                    className='ml-auto h-auto rounded-[7px] border-white/14 bg-transparent px-2.5 py-1 font-sans text-[11.5px] text-[#8aa0bd] hover:border-[rgba(124,160,255,0.45)] hover:bg-transparent hover:text-[#dbe7f6] dark:bg-transparent'
                  >
                    {t('Copy code')}
                  </CopyButton>
                )}
              </div>
              {snippets &&
                CODE_LANGS.map((lang) => (
                  <TabsContent key={lang} value={lang} className='min-h-[328px]'>
                    <pre className='m-0 overflow-x-auto p-[18px] font-mono text-[12.5px] leading-[1.8] text-[#dbe7f6]'>
                      <code>{snippets[lang]}</code>
                    </pre>
                  </TabsContent>
                ))}
              {!snippets && (
                <div className='flex min-h-[328px] items-center justify-center text-sm text-[#647d9c]'>
                  {t('Loading...')}
                </div>
              )}
              <div className='flex flex-wrap gap-4 border-t border-white/7 bg-white/2 px-[18px] py-3 text-xs text-[#8aa0bd]'>
                <span>
                  {t('Model')} <b className='font-semibold text-[#7cc0ff]'>{demoModel?.name ?? '--'}</b>
                </span>
                <span>
                  {t('Endpoint')} <b className='font-semibold text-[#7cc0ff]'>{snippetTarget?.path ?? '/v1/chat/completions'}</b>
                </span>
                <span>
                  {t('Protocol')} <b className='font-semibold text-[#7cc0ff]'>OpenAI</b>
                </span>
              </div>
            </Tabs>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function MiniModelDemo(props: { names: string[]; note: string }) {
  const shouldReduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const names = props.names.length > 0 ? props.names : ['"deepseek-flash"']

  useEffect(() => {
    if (shouldReduce || names.length < 2) return
    const timer = window.setInterval(() => {
      setFading(true)
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % names.length)
        setFading(false)
      }, 260)
    }, 2400)
    return () => window.clearInterval(timer)
  }, [names.length, shouldReduce])

  return (
    <div className='mt-4 flex flex-wrap items-center gap-2.5 rounded-[11px] border border-[rgba(124,160,255,0.18)] bg-[#0b1220] px-[15px] py-3 font-mono text-[12.5px] text-[#8aa0bd]'>
      <span>
        <span className='text-[#7cc0ff]'>model</span> ={' '}
        <span
          className={cn('text-[#a7f3d0] transition-opacity duration-250', fading && 'opacity-0')}
        >
          &quot;{names[index]}&quot;
        </span>
      </span>
      <span className='terminal-demo-blink inline-block h-3.5 w-[7px] bg-[#7cc0ff] align-[-2px]' aria-hidden='true' />
      <span className='ml-auto font-sans text-[11px] text-[#647d9c]'>
        {props.note}
      </span>
    </div>
  )
}

function FeaturesSection() {
  const { t } = useTranslation()
  const { models } = useShowcaseModels()

  const rotationNames = useMemo(
    () => pickFeatured(models, 5).map((model) => model.name),
    [models]
  )

  const features = [
    {
      icon: Boxes,
      gradient: 'linear-gradient(140deg,#2b78f5,#1553c4)',
      title: t('Unified access'),
      text: t('One key for DeepSeek, Kimi, GLM, Qwen, Doubao and more — no separate accounts or channels.'),
      demo: true,
    },
    {
      icon: WalletCards,
      gradient: 'linear-gradient(140deg,#059669,#047857)',
      title: t('Transparent billing'),
      text: t('Pay per token in real time; unit prices, discounts and every bill are visible in the console.'),
    },
    {
      icon: Zap,
      gradient: 'linear-gradient(140deg,#f97316,#ea580c)',
      title: t('Low-latency routing'),
      text: t('Nearest link and channel scheduling prefer stable upstream routes to cut queuing and timeouts.'),
    },
    {
      icon: KeyRound,
      gradient: 'linear-gradient(140deg,#7c3aed,#5b21b6)',
      title: t('Keys and permissions'),
      text: t('Group and manage keys, revoke or restore any time; split access for team members.'),
    },
    {
      icon: BarChart3,
      gradient: 'linear-gradient(140deg,#0b3d91,#0b1220)',
      title: t('Usage visibility'),
      text: t('Call logs, token spend, success rate and latency aggregated daily; trace any call.'),
    },
    {
      icon: ShieldCheck,
      gradient: 'linear-gradient(140deg,#6b7280,#374151)',
      title: t('Stable and available'),
      text: t('Multi-channel redundancy and health monitoring; failures return unified error codes.'),
    },
  ]

  return (
    <section className={cn(SECTION_CONTAINER, 'py-14 md:py-[72px]')}>
      <Reveal>
        <SectionHead
          eyebrow={t('Core capabilities')}
          title={t('A complete foundation for developers and teams')}
          lead={t('From access and billing to usage tracing — managed in one console.')}
        />
      </Reveal>
      <div className='grid grid-cols-1 gap-4 min-[620px]:grid-cols-2 lg:grid-cols-3'>
        {features.map((feature, index) => (
          <Reveal key={feature.title} delay={(index % 3) * 0.08}>
            <article className='group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white px-[22px] py-6 transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-[#d3deee] hover:shadow-[0_18px_48px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/40'>
              <span
                className='tb-gradient-icon mb-3.5 size-[42px] rounded-xl'
                style={{ background: feature.gradient }}
              >
                <feature.icon className='size-5' strokeWidth={1.8} aria-hidden='true' />
              </span>
              <h3 className='mb-[7px] text-base font-semibold text-slate-900 dark:text-slate-100'>
                {feature.title}
              </h3>
              <p className='text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400'>
                {feature.text}
              </p>
              {feature.demo && (
                <MiniModelDemo names={rotationNames} note={t('← switch models by changing this one line')} />
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function StepsSection() {
  const { t } = useTranslation()
  const isAuthenticated = !!useAuthStore((state) => state.auth.user)
  const openSignIn = useSignInDialogStore((state) => state.openSignIn)

  const steps: {
    n: string
    title: string
    text: string
    href: '/sign-up' | '/keys' | '/usage-logs'
    cta: string
    /** Guests are asked to sign in instead of landing on an empty console page. */
    requiresAuth?: boolean
  }[] = [
    {
      n: '01',
      title: t('Sign up'),
      text: t('Create an account and top up; trial credits and paid balance are kept separate.'),
      href: '/sign-up',
      cta: t('Create account'),
    },
    {
      n: '02',
      title: t('Create a key'),
      text: t('Generate an API key in the console, then put base_url and the key into your client or SDK.'),
      href: '/keys',
      cta: t('API Keys'),
      requiresAuth: !isAuthenticated,
    },
    {
      n: '03',
      title: t('Call and reconcile'),
      text: t('After calling, review usage, bills and logs in the console; top up or adjust limits as needed.'),
      href: '/usage-logs',
      cta: t('Usage Logs'),
      requiresAuth: !isAuthenticated,
    },
  ]

  const stepCardClassName =
    'block h-full rounded-2xl border border-slate-200 bg-white px-[22px] py-[26px] transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-[#d3deee] hover:shadow-[0_18px_48px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/40'

  return (
    <section className={cn(SECTION_CONTAINER, 'py-14 md:py-[72px]')}>
      <Reveal>
        <SectionHead
          eyebrow={t('Quick start')}
          title={t('Three steps to your first call')}
          lead={t('From sign-up to the first request — no extra backends to wire up.')}
        />
      </Reveal>
      <div className='relative grid grid-cols-1 gap-4 min-[720px]:grid-cols-3 min-[720px]:gap-[22px]'>
        <span
          aria-hidden='true'
          className='absolute inset-x-0 top-[21px] hidden h-0.5 bg-[linear-gradient(90deg,#1f6feb,#7c3aed)] opacity-20 min-[720px]:block'
        />
        {steps.map((step, index) => {
          const cardContent = (
            <>
              <span className='tb-gradient-btn mb-4 flex size-[42px] items-center justify-center rounded-full font-mono text-sm font-bold'>
                {step.n}
              </span>
              <h3 className='mb-[7px] text-base font-semibold text-slate-900 dark:text-slate-100'>
                {step.title}
              </h3>
              <p className='text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400'>
                {step.text}
              </p>
              <span className='mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-blue-700 dark:text-blue-400'>
                {step.cta}
                <ArrowRight className='size-3.5' strokeWidth={1.8} aria-hidden='true' />
              </span>
            </>
          )

          return (
            <Reveal key={step.n} delay={index * 0.08}>
              {step.requiresAuth ? (
                <button
                  type='button'
                  onClick={() => openSignIn(step.href)}
                  className={cn(stepCardClassName, 'w-full text-left')}
                >
                  {cardContent}
                </button>
              ) : (
                <Link to={step.href} className={stepCardClassName}>
                  {cardContent}
                </Link>
              )}
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

function CtaBand() {
  const { t } = useTranslation()
  return (
    <div className={cn(SECTION_CONTAINER, 'mt-14')}>
      <Reveal>
        <section className='relative overflow-hidden rounded-[22px] bg-[linear-gradient(128deg,#0b3d91_0%,#1f6feb_58%,#3b86f8_100%)] px-[30px] py-[52px] text-center text-white shadow-[0_24px_60px_rgba(11,61,145,0.28)]'>
          <span
            aria-hidden='true'
            className='pointer-events-none absolute -top-[30%] -left-[6%] h-[240px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.5),transparent_70%)] blur-[46px] opacity-50'
          />
          <span
            aria-hidden='true'
            className='pointer-events-none absolute -right-[4%] -bottom-[40%] h-[220px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.55),transparent_70%)] blur-[46px] opacity-50'
          />
          <h2 className='relative text-[clamp(22px,2.6vw,30px)] font-bold tracking-[-0.01em]'>
            {t('Ready to plug every model into one key?')}
          </h2>
          <p className='relative mx-auto mt-2.5 mb-[26px] max-w-[32em] text-[14.5px] text-white/82'>
            {t('No channel-by-channel integration — sign up and call flagship models through one endpoint.')}
          </p>
          <div className='relative flex flex-wrap justify-center gap-3'>
            <Link
              to={SHOWCASE_ROUTES.trial}
              className='inline-flex h-11 items-center rounded-[10px] bg-white px-5 text-[15px] font-semibold text-[#0b3d91] shadow-[0_8px_22px_rgba(4,18,50,0.35)] transition hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(4,18,50,0.42)]'
            >
              {t('Try online')}
            </Link>
            <Link
              to={SHOWCASE_ROUTES.market}
              className='inline-flex h-11 items-center rounded-[10px] border border-white/35 bg-white/12 px-5 text-[15px] font-semibold text-white transition hover:-translate-y-px hover:bg-white/20'
            >
              {t('Browse models')}
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  )
}

export function ShowcaseHome() {
  return (
    <ShowcaseShell>
      <HeroSection />
      <StatsBar />
      <EcosystemSection />
      <CodeSection />
      <FeaturesSection />
      <StepsSection />
      <CtaBand />
    </ShowcaseShell>
  )
}
