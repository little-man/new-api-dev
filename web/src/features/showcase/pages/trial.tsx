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
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { ShowcaseShell } from '../components/showcase-shell'
import { useShowcaseModels } from '../hooks/use-showcase-models'

const TOTAL_QUOTA = 500_000
const QUOTA_PER_MESSAGE = 1_200

type ChatRole = 'user' | 'assistant'
type TrialType = 'chat' | 'image' | 'video'

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
}

interface ShowcaseTrialProps {
  initialModel?: string
}

function useFakeReply() {
  const { t } = useTranslation()

  return useMemo(() => {
    const code = t(
      'A practical way to read a large CSV in chunks: 1) open the file and stream it line by line instead of loading everything into memory; 2) parse each chunk into typed records and validate the columns you rely on; 3) write results incrementally and keep a checkpoint so a failure does not restart from zero. This is a simulated reply in the demo environment — connect a real key to run it against a live model.'
    )
    const contract = t(
      'Three contract clauses worth checking first: 1) payment and acceptance — when the work counts as delivered and how disputes are resolved; 2) liability — the cap of damages and what triggers termination; 3) intellectual property — who owns deliverables and whether the vendor can reuse them. This is a simulated reply in the demo environment.'
    )
    const moe = t(
      'Mixture-of-Experts models keep many expert subnetworks but only activate a few per token, which raises total capacity without raising per-token compute. Three points to watch: routing balance, expert parallelism during training, and inference memory footprint. This is a simulated reply in the demo environment.'
    )
    const fallback = t(
      'This is a simulated reply in the demo environment. Once a real key is connected, the request goes to {{model}}. See the Model Marketplace for current pricing and context limits.'
    )

    return (input: string, model: string) => {
      const text = input.toLowerCase()
      if (/python|script|脚本|csv|code|代码/.test(text)) return code
      if (/contract|risk|合同|风险|条款/.test(text)) return contract
      if (/moe|mixture|混合专家/.test(text)) return moe
      return fallback.replace('{{model}}', model)
    }
  }, [t])
}

export function ShowcaseTrial({ initialModel }: ShowcaseTrialProps) {
  const { t } = useTranslation()
  const { models, isLoading } = useShowcaseModels()
  const isAuthenticated = !!useAuthStore((state) => state.auth.user)
  const buildReply = useFakeReply()

  const textModels = useMemo(
    () => models.filter((model) => model.kind === 'text'),
    [models]
  )

  const [model, setModel] = useState(initialModel ?? '')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [quota, setQuota] = useState(TOTAL_QUOTA)
  const [trialType, setTrialType] = useState<TrialType>('chat')

  const chatRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)
  const counter = useRef(0)

  const activeModel = useMemo(() => {
    if (model && textModels.some((item) => item.name === model)) return model
    if (initialModel && textModels.some((item) => item.name === initialModel)) {
      return initialModel
    }
    return textModels[0]?.name ?? ''
  }, [model, initialModel, textModels])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const node = chatRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages])

  const suggestions = [
    t('Write a Python script'),
    t('Summarize contract risks'),
    t('Explain MoE models'),
  ]

  const send = (raw?: string) => {
    const text = (raw ?? input).trim()
    if (!text || streaming || !activeModel) return

    const stamp = Date.now()
    counter.current += 1
    const userId = `u-${stamp}-${counter.current}`

    setMessages((prev) => [...prev, { id: userId, role: 'user', text }])
    setInput('')
    setStreaming(true)

    const reply = buildReply(text, activeModel)
    const assistantId = `a-${stamp}-${counter.current}`
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', text: '' },
    ])

    let cursor = 0
    timerRef.current = window.setInterval(() => {
      cursor += 2
      const slice = reply.slice(0, cursor)
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, text: slice } : message
        )
      )
      if (cursor >= reply.length) {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
        setStreaming(false)
        setQuota((current) => {
          const next = Math.max(0, current - QUOTA_PER_MESSAGE)
          if (next === 0) {
            toast.warning(t('Trial quota exhausted. Top up to keep calling.'))
          }
          return next
        })
      }
    }, 22)
  }

  const clearChat = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setMessages([])
    setStreaming(false)
    setQuota(TOTAL_QUOTA)
    toast.success(t('Conversation cleared'))
  }

  const pickType = (next: TrialType) => {
    setTrialType(next)
    if (next === 'chat') {
      toast.success(t('Switched to text chat'))
    } else if (next === 'image') {
      toast.info(
        t(
          'Image generation is reserved. The demo environment supports text chat only.'
        )
      )
    } else {
      toast.info(
        t(
          'Video generation is reserved. The demo environment supports text chat only.'
        )
      )
    }
  }

  const quotaPercent = Math.min(100, Math.round((quota / TOTAL_QUOTA) * 100))

  const types: Array<{ key: TrialType; label: string }> = [
    { key: 'chat', label: t('Text chat') },
    { key: 'image', label: t('Image generation') },
    { key: 'video', label: t('Video generation') },
  ]

  return (
    <ShowcaseShell>
      <div className='mx-auto w-full max-w-7xl px-4 pt-9 pb-16 md:px-6'>
        <div className='mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-[12px] text-slate-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-slate-300'>
          <span>
            {isAuthenticated
              ? t(
                  'This trial keeps simulated replies. Use the Playground to call live models with your own key.'
                )
              : t(
                  'This trial runs locally with simulated replies. Sign in to call live models with your own key.'
                )}
          </span>
          <Link
            to={isAuthenticated ? '/playground' : '/sign-in'}
            search={isAuthenticated ? undefined : { redirect: '/playground' }}
            className='font-semibold whitespace-nowrap text-blue-700 hover:underline dark:text-blue-400'
          >
            {isAuthenticated ? t('Open Playground') : t('Sign in')} →
          </Link>
        </div>
        <div className='grid gap-6 lg:grid-cols-[210px_1fr]'>
          <aside className='self-start lg:sticky lg:top-20'>
            <h2 className='mb-2 text-[11.5px] font-semibold tracking-wide text-slate-400 uppercase'>
              {t('Trial type')}
            </h2>
            <div className='flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible'>
              {types.map((item) => (
                <button
                  key={item.key}
                  type='button'
                  aria-pressed={trialType === item.key}
                  onClick={() => pickType(item.key)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-[12.5px] font-medium whitespace-nowrap transition-colors',
                    trialType === item.key
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className='mt-3 hidden text-[11.5px] leading-relaxed text-slate-500 lg:block dark:text-slate-400'>
              {t(
                'Trial quota is separate from account balance. It is for evaluation only and never incurs charges.'
              )}
            </p>
          </aside>

          <section className='flex min-h-[560px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'>
            <div className='flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800'>
              <label
                htmlFor='showcase-trial-model'
                className='text-[11.5px] font-semibold text-slate-500 dark:text-slate-400'
              >
                {t('Model')}
              </label>
              <select
                id='showcase-trial-model'
                value={activeModel}
                disabled={isLoading || textModels.length === 0}
                onChange={(event) => setModel(event.target.value)}
                className='h-8 max-w-[260px] min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
              >
                {textModels.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>

              <div className='ml-auto flex items-center gap-2'>
                <span className='text-[11.5px] whitespace-nowrap text-slate-500 dark:text-slate-400'>
                  {t('Demo tokens left')}
                </span>
                <span className='h-1.5 w-[110px] overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700'>
                  <span
                    className='block h-full rounded-full bg-blue-600 transition-all'
                    style={{ width: `${quotaPercent}%` }}
                  />
                </span>
                <b className='text-[11.5px] font-semibold text-slate-700 tabular-nums dark:text-slate-200'>
                  {quota.toLocaleString()}
                </b>
                <button
                  type='button'
                  onClick={clearChat}
                  className='rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300'
                >
                  {t('Clear')}
                </button>
              </div>
            </div>

            <div
              ref={chatRef}
              className='flex-1 overflow-y-auto px-4 py-5'
              aria-live='polite'
            >
              {messages.length === 0 ? (
                <div className='flex h-full flex-col items-start justify-center gap-4'>
                  <h3 className='text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100'>
                    {t('Make your first call right here')}
                  </h3>
                  <p className='max-w-lg text-sm text-slate-500 dark:text-slate-400'>
                    {t(
                      'Pick a model, ask anything, and see how the endpoint behaves. Replies are simulated locally in this demo.'
                    )}
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type='button'
                        onClick={() => send(suggestion)}
                        className='rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className='space-y-4'>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-2.5',
                        message.role === 'user'
                          ? 'flex-row-reverse'
                          : 'flex-row'
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold',
                          message.role === 'user'
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                            : 'bg-blue-600 text-white'
                        )}
                      >
                        {message.role === 'user' ? t('Me') : 'AI'}
                      </span>
                      <div
                        className={cn(
                          'max-w-[88%] rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap',
                          message.role === 'user'
                            ? 'bg-blue-50 text-slate-800 dark:bg-blue-500/15 dark:text-slate-100'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                        )}
                      >
                        {message.text || (
                          <span className='text-slate-400'>…</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='border-t border-slate-100 px-4 py-3 dark:border-slate-800'>
              <textarea
                value={input}
                rows={3}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    send()
                  }
                }}
                placeholder={t(
                  'Ask anything. Enter to send, Shift+Enter for a new line.'
                )}
                className='w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100'
              />
              <div className='mt-2 flex items-center justify-between gap-3'>
                <p className='hidden text-[11px] text-slate-400 sm:block'>
                  {t(
                    'Demo environment: replies are simulated locally and never call a real model.'
                  )}
                </p>
                <button
                  type='button'
                  disabled={streaming || !input.trim() || !activeModel}
                  onClick={() => send()}
                  className='ml-auto inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {streaming ? t('Generating…') : t('Send')}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ShowcaseShell>
  )
}
