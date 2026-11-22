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
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { QuickstartDialog } from '../components/quickstart-dialog'
import { ShowcaseShell } from '../components/showcase-shell'
import {
  useShowcaseModels,
  type ShowcaseModel,
} from '../hooks/use-showcase-models'
import { MODEL_KIND_LABELS, SHOWCASE_ROUTES } from '../lib/showcase-nav'
import {
  OTHER_VENDOR,
  formatPricePerMillion,
  type ModelKind,
} from '../lib/showcase-pricing'

type KindFilter = 'all' | ModelKind
type VisibleKind = Exclude<KindFilter, 'all'>
type PriceFilter = 'all' | 'low' | 'mid' | 'high'
type SortMode = 'recommended' | 'price' | 'name'

const PAGE_SIZE = 24
const VENDOR_PREVIEW = 8

/** USD per 1M tokens; the bands follow common LLM price tiers. */
const PRICE_TIERS: Array<{ key: Exclude<PriceFilter, 'all'>; max: number }> = [
  { key: 'low', max: 0.5 },
  { key: 'mid', max: 2 },
]

function matchesPrice(model: ShowcaseModel, filter: PriceFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'low') return model.platformInput <= PRICE_TIERS[0].max
  if (filter === 'mid') {
    return (
      model.platformInput > PRICE_TIERS[0].max &&
      model.platformInput <= PRICE_TIERS[1].max
    )
  }
  return model.platformInput > PRICE_TIERS[1].max
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type='button'
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-600'
      )}
    >
      {label}
    </button>
  )
}

function PriceRow({
  label,
  price,
  unit,
}: {
  label: string
  price: number
  unit: string
}) {
  const { t } = useTranslation()

  return (
    <div className='grid grid-cols-[46px_1fr_auto] items-center gap-1 border-t border-slate-100 py-1.5 first:border-t-0 dark:border-slate-800'>
      <span className='text-[11px] text-slate-500 dark:text-slate-400'>
        {label}
      </span>
      <b className='text-[12.5px] font-bold text-blue-700 dark:text-blue-400'>
        {price > 0 ? formatPricePerMillion(price) : t('Free of charge')}
      </b>
      <small className='text-[10px] font-medium text-slate-400'>{unit}</small>
    </div>
  )
}

function ModelCard({
  model,
  onQuickstart,
}: {
  model: ShowcaseModel
  onQuickstart: (model: ShowcaseModel) => void
}) {
  const { t } = useTranslation()
  const unit = model.perRequest ? t('/call') : '/M'
  const kindLabel = t(MODEL_KIND_LABELS[model.kind] ?? 'Text')

  return (
    <article className='flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-[0_10px_30px_-16px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-900'>
      <div className='flex items-start gap-3'>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
            model.tone
          )}
        >
          {model.initials.slice(0, 2)}
        </span>
        <div className='min-w-0'>
          <h3 className='truncate text-[15px] font-bold text-slate-900 dark:text-slate-100'>
            {model.name}
          </h3>
          <p className='truncate text-[11.5px] text-slate-500 dark:text-slate-400'>
            {model.vendor === OTHER_VENDOR ? t('Other') : model.vendor} ·{' '}
            {kindLabel}
          </p>
        </div>
      </div>

      <p className='mt-2.5 line-clamp-2 min-h-[2.4em] text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400'>
        {model.description || t('No description provided')}
      </p>

      {model.tags.length > 0 && (
        <div className='mt-2 flex flex-wrap gap-1'>
          {model.tags.map((tag) => (
            <span
              key={tag}
              className='rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className='mt-3 rounded-lg bg-slate-50/80 px-2.5 py-1.5 dark:bg-slate-800/40'>
        <div className='grid grid-cols-[46px_1fr_auto] gap-1 pb-1 text-[10.5px] font-medium text-slate-400'>
          <span />
          <span>{t('Unit price')}</span>
          <span className='text-right'>{t('Billing unit')}</span>
        </div>
        <PriceRow
          label={model.perRequest ? t('Per call') : t('Input')}
          price={model.platformInput}
          unit={unit}
        />
        {!model.perRequest && (
          <PriceRow
            label={t('Output')}
            price={model.platformOutput}
            unit='/M'
          />
        )}
      </div>

      <div className='mt-3 flex items-center gap-2'>
        <Link
          to={SHOWCASE_ROUTES.trial}
          search={{ model: model.name }}
          className='inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-slate-300 px-2 text-xs font-semibold whitespace-nowrap text-slate-700 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500'
        >
          {t('Try online')}
        </Link>
        <button
          type='button'
          onClick={() => onQuickstart(model)}
          className='inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-blue-600 px-2 text-xs font-semibold whitespace-nowrap text-white transition hover:bg-blue-700'
        >
          {t('Quick start')}
        </button>
      </div>
    </article>
  )
}

export function ShowcaseMarket() {
  const { t } = useTranslation()
  const { models, isLoading, error } = useShowcaseModels()

  const [keyword, setKeyword] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [vendor, setVendor] = useState<string>('all')
  const [price, setPrice] = useState<PriceFilter>('all')
  const [sort, setSort] = useState<SortMode>('recommended')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [showAllVendors, setShowAllVendors] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [quickstartModel, setQuickstartModel] = useState<ShowcaseModel | null>(
    null
  )
  const [quickstartOpen, setQuickstartOpen] = useState(false)

  const openQuickstart = (model: ShowcaseModel) => {
    setQuickstartModel(model)
    setQuickstartOpen(true)
  }

  const vendors = useMemo(() => {
    const seen = new Set<string>()
    for (const model of models) {
      if (model.vendor) seen.add(model.vendor)
    }
    return [...seen].sort((a, b) => {
      // Keep the catch-all bucket last; it is not a real vendor.
      if (a === OTHER_VENDOR) return 1
      if (b === OTHER_VENDOR) return -1
      return a.localeCompare(b)
    })
  }, [models])

  const vendorLabel = (value: string) =>
    value === OTHER_VENDOR ? t('Other') : value

  const kinds = useMemo<VisibleKind[]>(() => {
    const seen = new Set<VisibleKind>()
    for (const model of models) {
      seen.add(model.kind)
    }
    const order: VisibleKind[] = [
      'text',
      'vision',
      'image',
      'video',
      'audio',
      'embedding',
    ]
    return order.filter((item) => seen.has(item))
  }, [models])

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase()
    const result = models.filter((model) => {
      if (kind !== 'all' && model.kind !== kind) return false
      if (vendor !== 'all' && model.vendor !== vendor) return false
      if (!matchesPrice(model, price)) return false
      if (!needle) return true
      return (
        model.name.toLowerCase().includes(needle) ||
        model.vendor.toLowerCase().includes(needle)
      )
    })

    if (sort === 'price') {
      result.sort((a, b) => a.platformInput - b.platformInput)
    } else if (sort === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      result.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'text' ? -1 : 1
        return a.platformInput - b.platformInput
      })
    }
    return result
  }, [models, kind, vendor, price, keyword, sort])

  const shown = filtered.slice(0, visible)

  const resetFilters = () => {
    setKeyword('')
    setKind('all')
    setVendor('all')
    setPrice('all')
    setSort('recommended')
    setVisible(PAGE_SIZE)
  }

  return (
    <ShowcaseShell>
      <div className='mx-auto w-full max-w-7xl px-4 pt-9 pb-4 md:px-6'>
        <p className='text-xs font-semibold text-blue-700 dark:text-blue-400'>
          {t('Transparent pricing · Pay as you go')}
        </p>
        <h1 className='mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl dark:text-slate-100'>
          {t('Model Marketplace')}
        </h1>
        <p className='mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400'>
          {t(
            'Every model below is routed through the same OpenAI-compatible endpoint. Prices are what this platform actually charges, read live from the billing table.'
          )}
        </p>
      </div>

      <div className='mx-auto grid w-full max-w-7xl gap-7 px-4 pb-16 md:px-6 lg:grid-cols-[236px_1fr]'>
        <aside className='self-start lg:sticky lg:top-20'>
          <button
            type='button'
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((value) => !value)}
            className='flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
          >
            {t('Filters')}
            <span
              aria-hidden='true'
              className={cn(
                'transition-transform',
                filtersOpen && 'rotate-180'
              )}
            >
              ⌄
            </span>
          </button>
          <div
            className={cn(
              'mt-4 space-y-5 lg:mt-0',
              filtersOpen ? 'block' : 'hidden lg:block'
            )}
          >
            <input
              type='search'
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value)
                setVisible(PAGE_SIZE)
              }}
              placeholder={t('Filter by vendor or type')}
              aria-label={t('Search models')}
              className='w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
            />

            <div>
              <h2 className='mb-2 text-[11.5px] font-semibold tracking-wide text-slate-400 uppercase'>
                {t('Model type')}
              </h2>
              <div className='flex flex-wrap gap-1.5'>
                <Chip
                  active={kind === 'all'}
                  label={t('All')}
                  onClick={() => {
                    setKind('all')
                    setVisible(PAGE_SIZE)
                  }}
                />
                {kinds.map((item) => (
                  <Chip
                    key={item}
                    active={kind === item}
                    label={t(MODEL_KIND_LABELS[item] ?? 'Text')}
                    onClick={() => {
                      setKind(item)
                      setVisible(PAGE_SIZE)
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className='mb-2 text-[11.5px] font-semibold tracking-wide text-slate-400 uppercase'>
                {t('Vendor')}
              </h2>
              <div className='flex flex-wrap gap-1.5'>
                <Chip
                  active={vendor === 'all'}
                  label={t('All')}
                  onClick={() => {
                    setVendor('all')
                    setVisible(PAGE_SIZE)
                  }}
                />
                {vendors
                  .slice(0, showAllVendors ? vendors.length : VENDOR_PREVIEW)
                  .map((item) => (
                    <Chip
                      key={item}
                      active={vendor === item}
                      label={vendorLabel(item)}
                      onClick={() => {
                        setVendor(item)
                        setVisible(PAGE_SIZE)
                      }}
                    />
                  ))}
                {vendors.length > VENDOR_PREVIEW && (
                  <button
                    type='button'
                    onClick={() => setShowAllVendors((value) => !value)}
                    className='rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium whitespace-nowrap text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:text-slate-400'
                  >
                    {showAllVendors
                      ? t('Collapse')
                      : `+${vendors.length - VENDOR_PREVIEW} ${t('More')}`}
                  </button>
                )}
              </div>
            </div>

            <div>
              <h2 className='mb-2 text-[11.5px] font-semibold tracking-wide text-slate-400 uppercase'>
                {t('Price')}
              </h2>
              <div className='flex flex-wrap gap-1.5'>
                <Chip
                  active={price === 'all'}
                  label={t('All')}
                  onClick={() => setPrice('all')}
                />
                <Chip
                  active={price === 'low'}
                  label={`≤ ${formatPricePerMillion(PRICE_TIERS[0].max)}`}
                  onClick={() => setPrice('low')}
                />
                <Chip
                  active={price === 'mid'}
                  label={`${formatPricePerMillion(PRICE_TIERS[0].max)}–${formatPricePerMillion(PRICE_TIERS[1].max)}`}
                  onClick={() => setPrice('mid')}
                />
                <Chip
                  active={price === 'high'}
                  label={`> ${formatPricePerMillion(PRICE_TIERS[1].max)}`}
                  onClick={() => setPrice('high')}
                />
              </div>
            </div>
          </div>
        </aside>

        <section>
          <div className='mb-4 flex flex-wrap items-center gap-3'>
            <input
              type='search'
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value)
                setVisible(PAGE_SIZE)
              }}
              placeholder={t('Search model name, e.g. deepseek, kimi')}
              aria-label={t('Search models')}
              className='h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              aria-label={t('Sort models')}
              className='h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            >
              <option value='recommended'>{t('Recommended')}</option>
              <option value='price'>{t('Price: low to high')}</option>
              <option value='name'>{t('Name')}</option>
            </select>
            <span className='text-xs text-slate-500 dark:text-slate-400'>
              {t('{{count}} models', { count: filtered.length })}
            </span>
          </div>

          {isLoading && (
            <div className='rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400 dark:border-slate-800'>
              {t('Loading...')}
            </div>
          )}

          {!isLoading && !!error && (
            <div className='rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'>
              {t('Failed to load pricing data')}
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className='rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700'>
              <p className='text-sm text-slate-500 dark:text-slate-400'>
                {t('No matching models.')}
              </p>
              <button
                type='button'
                onClick={resetFilters}
                className='mt-3 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400'
              >
                {t('Clear filters')}
              </button>
            </div>
          )}

          {shown.length > 0 && (
            <>
              <div className='grid gap-3 sm:grid-cols-2'>
                {shown.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    onQuickstart={openQuickstart}
                  />
                ))}
              </div>
              {visible < filtered.length && (
                <div className='mt-6 text-center'>
                  <button
                    type='button'
                    onClick={() => setVisible((count) => count + PAGE_SIZE)}
                    className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200'
                  >
                    {t('Load more')}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <QuickstartDialog
        model={quickstartModel}
        open={quickstartOpen}
        onOpenChange={setQuickstartOpen}
      />
    </ShowcaseShell>
  )
}
