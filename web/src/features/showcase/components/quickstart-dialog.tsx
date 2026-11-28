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
import { Check, Copy } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchTokenKey, getApiKeys } from '@/features/keys/api'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useSignInDialogStore } from '@/stores/sign-in-dialog-store'

import type { ShowcaseModel } from '../hooks/use-showcase-models'
import {
  buildSnippet,
  resolveSnippetTargets,
  SNIPPET_LANG_LABELS,
  type SnippetKind,
  type SnippetLang,
} from '../lib/quickstart-snippets'
import { SHOWCASE_ROUTES } from '../lib/showcase-nav'
import { formatPricePerMillion } from '../lib/showcase-pricing'

const PRIMARY_BUTTON =
  'inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold whitespace-nowrap text-white transition hover:bg-blue-700'
const GHOST_BUTTON =
  'inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 px-3 text-xs font-semibold whitespace-nowrap text-slate-700 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500'

function CopyValueButton({
  value,
  label,
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const { t } = useTranslation()
  const { copiedText, copyToClipboard } = useCopyToClipboard({ notify: false })
  const copied = copiedText === value

  return (
    <button
      type='button'
      onClick={() => copyToClipboard(value)}
      aria-label={copied ? t('Copied') : (label ?? t('Copy'))}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
        className
      )}
    >
      {copied ? (
        <Check className='size-3 text-emerald-500' aria-hidden='true' />
      ) : (
        <Copy className='size-3' aria-hidden='true' />
      )}
      {copied ? t('Copied') : (label ?? t('Copy'))}
    </button>
  )
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-800/40'>
      <span className='w-16 shrink-0 text-[11px] font-medium text-slate-400'>
        {label}
      </span>
      <code className='min-w-0 flex-1 truncate font-mono text-[12px] text-slate-700 dark:text-slate-200'>
        {value}
      </code>
      <CopyValueButton value={value} />
    </div>
  )
}

/**
 * Key picker for the signed-in visitor. The full secret is never rendered:
 * it is fetched on demand and lands straight in the clipboard, mirroring the
 * console keys panel.
 */
function ApiKeySection({ open }: { open: boolean }) {
  const { t } = useTranslation()
  const isAuthenticated = !!useAuthStore((state) => state.auth.user)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [copying, setCopying] = useState(false)

  const keysQuery = useQuery({
    queryKey: ['showcase-quickstart', 'keys'],
    queryFn: async () =>
      (await getApiKeys({ p: 1, size: 50 })).data?.items ?? [],
    enabled: open && isAuthenticated,
    staleTime: 30_000,
  })

  const enabledKeys = useMemo(
    () => (keysQuery.data ?? []).filter((key) => key.status === 1),
    [keysQuery.data]
  )
  const activeKey =
    enabledKeys.find((key) => key.id === selectedId) ?? enabledKeys[0]

  const copyKey = async (id: number) => {
    setCopying(true)
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
      setCopying(false)
    }
  }

  function renderBody(): ReactNode {
    if (!isAuthenticated) {
      return (
        <>
          <code className='min-w-0 flex-1 truncate font-mono text-[12px] text-slate-400'>
            sk-...
          </code>
          <span className='text-[11.5px] text-slate-500 dark:text-slate-400'>
            {t('Sign in to create and copy an API key.')}
          </span>
        </>
      )
    }
    if (keysQuery.isLoading) {
      return (
        <span className='text-[12px] text-slate-400'>{t('Loading...')}</span>
      )
    }
    if (!activeKey) {
      return (
        <span className='min-w-0 flex-1 text-[12px] text-slate-500 dark:text-slate-400'>
          {t('No API keys yet. Create one to start calling.')}
        </span>
      )
    }
    return (
      <>
        {enabledKeys.length > 1 && (
          <select
            value={activeKey.id}
            onChange={(event) => setSelectedId(Number(event.target.value))}
            aria-label={t('API Key')}
            className='h-7 max-w-40 rounded-md border border-slate-200 bg-white px-1.5 text-[11.5px] text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
          >
            {enabledKeys.map((key) => (
              <option key={key.id} value={key.id}>
                {key.name}
              </option>
            ))}
          </select>
        )}
        <code className='min-w-0 flex-1 truncate font-mono text-[12px] text-slate-700 dark:text-slate-200'>
          {`sk-${activeKey.key.slice(0, 4)}…${activeKey.key.slice(-4)}`}
        </code>
        <button
          type='button'
          disabled={copying}
          onClick={() => copyKey(activeKey.id)}
          className='shrink-0 text-[11.5px] font-semibold text-blue-700 hover:underline disabled:opacity-50 dark:text-blue-400'
        >
          {t('Copy full key')}
        </button>
      </>
    )
  }

  return (
    <div className='rounded-lg border border-slate-200 px-2.5 py-2 dark:border-slate-800'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='w-16 shrink-0 text-[11px] font-medium text-slate-400'>
          {t('API Key')}
        </span>
        {renderBody()}
      </div>
    </div>
  )
}

export function QuickstartDialog({
  model,
  open,
  onOpenChange,
}: {
  /** Kept mounted while closing so the exit animation still has a model. */
  model: ShowcaseModel | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const isAuthenticated = !!useAuthStore((state) => state.auth.user)
  const openSignIn = useSignInDialogStore((state) => state.openSignIn)
  const [lang, setLang] = useState<SnippetLang>('curl')
  const [targetKind, setTargetKind] = useState<SnippetKind>('chat')
  const { copiedText, copyToClipboard } = useCopyToClipboard({
    notify: false,
    successMessage: t('Copied to clipboard'),
  })

  const baseUrl = useMemo(
    () => (typeof window === 'undefined' ? '' : window.location.origin),
    []
  )
  const targets = useMemo(
    () => (model ? resolveSnippetTargets(model) : []),
    [model]
  )
  const activeTarget =
    targets.find((target) => target.kind === targetKind) ?? targets[0]
  const code =
    model && activeTarget
      ? buildSnippet(lang, activeTarget, { baseUrl, modelName: model.name })
      : ''

  if (!model) return null

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Quick start')}
      description={t(
        'Call {{model}} from your app: copy the endpoint, add your API key, and send the first request.',
        { model: model.name }
      )}
      contentClassName='sm:max-w-3xl'
      footer={
        <div className='flex w-full flex-wrap items-center justify-between gap-2'>
          <Link
            to={SHOWCASE_ROUTES.trial}
            search={{ model: model.name }}
            className={GHOST_BUTTON}
          >
            {t('Try online')}
          </Link>
          {isAuthenticated ? (
            <Link to='/keys' className={PRIMARY_BUTTON}>
              {t('Manage keys')}
            </Link>
          ) : (
            <button
              type='button'
              onClick={() => {
                onOpenChange(false)
                openSignIn(SHOWCASE_ROUTES.market)
              }}
              className={PRIMARY_BUTTON}
            >
              {t('Sign in to get a key')}
            </button>
          )}
        </div>
      }
    >
      <div className='space-y-3'>
        <ValueRow label={t('Base URL')} value={baseUrl} />
        <ValueRow label={t('Model')} value={model.name} />
        <ApiKeySection open={open} />

        {activeTarget ? (
          <div>
            <div className='flex flex-wrap items-center gap-2'>
              {targets.length > 1 && (
                <select
                  value={activeTarget.kind}
                  onChange={(event) =>
                    setTargetKind(event.target.value as SnippetKind)
                  }
                  aria-label={t('Endpoint')}
                  className='h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                >
                  {targets.map((target) => (
                    <option key={target.kind} value={target.kind}>
                      {t(target.labelKey)}
                    </option>
                  ))}
                </select>
              )}
              <Tabs
                value={lang}
                onValueChange={(value) => setLang(value as SnippetLang)}
                className='gap-0'
              >
                <TabsList aria-label={t('Code samples')}>
                  {(Object.keys(SNIPPET_LANG_LABELS) as SnippetLang[]).map(
                    (item) => (
                      <TabsTrigger
                        key={item}
                        value={item}
                        className='px-2.5 text-xs'
                      >
                        {SNIPPET_LANG_LABELS[item]}
                      </TabsTrigger>
                    )
                  )}
                </TabsList>
              </Tabs>
              <button
                type='button'
                onClick={() => copyToClipboard(code)}
                className='ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500'
              >
                {copiedText === code ? (
                  <Check
                    className='size-3.5 text-emerald-500'
                    aria-hidden='true'
                  />
                ) : (
                  <Copy className='size-3.5' aria-hidden='true' />
                )}
                {copiedText === code ? t('Copied') : t('Copy code')}
              </button>
            </div>
            <pre className='mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-[12px] leading-relaxed text-slate-100'>
              <code>{code}</code>
            </pre>
            <p className='mt-2 text-[11.5px] text-slate-500 dark:text-slate-400'>
              {t('Replace')}{' '}
              <code className='rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] dark:bg-slate-800'>
                {'<YOUR_API_KEY>'}
              </code>{' '}
              {t('with the API key from your token settings.')}
            </p>
          </div>
        ) : (
          <p className='rounded-lg border border-dashed border-slate-300 p-3 text-[12px] leading-relaxed text-slate-500 dark:border-slate-700 dark:text-slate-400'>
            {t(
              'This model is served through a dedicated endpoint. Copy the base URL and model name, then follow the request format in the console.'
            )}
          </p>
        )}

        <p className='text-[11.5px] text-slate-400'>
          {t('Billing')} ·{' '}
          {model.perRequest
            ? `${t('Per call')} ${formatPricePerMillion(model.platformInput)}`
            : `${t('Input')} ${formatPricePerMillion(model.platformInput)}/M · ${t('Output')} ${formatPricePerMillion(model.platformOutput)}/M`}
        </p>
      </div>
    </Dialog>
  )
}
