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
import { QUOTA_TYPE_VALUES } from '@/features/pricing/constants'
import type { PricingModel } from '@/features/pricing/types'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'

// ----------------------------------------------------------------------------
// Showcase pricing helpers
//
// The backend stores `model_ratio` in billing units where ratio 1.0 equals
// 2 USD per 1M tokens, and `group_ratio` is the tenant-level multiplier. The
// pricing payload carries no vendor list price, so the showcase never invents
// a "struck-through" official price: it only renders what the platform will
// actually charge.
// ----------------------------------------------------------------------------

export type ModelKind =
  | 'text'
  | 'vision'
  | 'image'
  | 'video'
  | 'audio'
  | 'embedding'

/** Billing scale: `model_ratio` 1.0 == 2 USD per 1M tokens. */
export const USD_PER_MILLION_PER_RATIO = 2

const KIND_MATCHERS: Array<{ kind: ModelKind; pattern: RegExp }> = [
  { kind: 'video', pattern: /video|sora|kling|runway|veo|hailuo|wan2/i },
  { kind: 'image', pattern: /image|dall|flux|midjourney|mj[-_]|sd3|imagen/i },
  { kind: 'embedding', pattern: /embed/i },
  { kind: 'audio', pattern: /audio|tts|whisper|speech|realtime/i },
]

export function modelKind(model: PricingModel): ModelKind {
  // `/api/pricing` only reports the transport (`openai`), so the model name is
  // the only reliable signal for image / video / embedding families.
  const descriptors = [
    model.model_name,
    ...(model.supported_endpoint_types ?? []),
    ...(model.input_modalities ?? []),
    ...(model.output_modalities ?? []),
  ].join(' ')

  if (model.output_modalities?.includes('video')) return 'video'
  for (const matcher of KIND_MATCHERS) {
    if (matcher.pattern.test(descriptors)) return matcher.kind
  }
  // Per-request billing on this platform is image / task based.
  if (model.quota_type === QUOTA_TYPE_VALUES.REQUEST) return 'image'
  if (model.capabilities?.includes('vision')) return 'vision'
  return 'text'
}

/**
 * Pick the most favourable enabled group ratio so the showcase always shows
 * the cheapest price a visitor could actually get.
 */
export function resolveGroupRatio(
  model: PricingModel,
  groupRatio: Record<string, number>
): number {
  const groups = Array.isArray(model.enable_groups) ? model.enable_groups : []
  const candidates = groups
    .map((group) => groupRatio[group])
    .filter(
      (ratio): ratio is number =>
        typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0
    )
  if (candidates.length > 0) return Math.min(...candidates)

  const fallback = groupRatio['default']
  return typeof fallback === 'number' && fallback > 0 ? fallback : 1
}

/** Platform price in USD per 1M tokens, group discount applied. */
export function platformPricePerMillion(
  model: PricingModel,
  ratio: number
): { input: number; output: number } {
  if (model.quota_type === QUOTA_TYPE_VALUES.REQUEST) {
    const fixed = (model.model_price ?? 0) * ratio
    return { input: fixed, output: fixed }
  }
  const input = model.model_ratio * USD_PER_MILLION_PER_RATIO * ratio
  const output = input * (model.completion_ratio || 1)
  return { input, output }
}

export function formatPricePerMillion(usd: number): string {
  return formatBillingCurrencyFromUSD(usd, {
    digitsLarge: 2,
    digitsSmall: 4,
    abbreviate: false,
  })
}

/**
 * Vendor names match the platform's own vendor list so the marketplace filters
 * never mix vocabularies (`阿里巴巴` and `Alibaba` side by side).
 */
const VENDOR_PREFIXES: Array<[RegExp, string]> = [
  [/^(gpt|dall-e|whisper|tts|text-embedding|omni|o1|o3|o4)/i, 'OpenAI'],
  [/^claude/i, 'Anthropic'],
  [/^(gemini|gemma|imagen|veo|palm|learnlm)/i, 'Google'],
  [/^deepseek/i, 'DeepSeek'],
  [/^(qwen|qwq|qvq|tongyi)/i, '阿里巴巴'],
  [/^(glm|chatglm|codegeex)/i, '智谱'],
  [/^(kimi|moonshot)/i, 'Moonshot'],
  [/^grok/i, 'xAI'],
  [/^(llama|meta-)/i, 'Meta'],
  [/^(mistral|mixtral|codestral|magistral)/i, 'Mistral'],
  [/^(doubao|seedream|seedance|skylark)/i, '字节跳动'],
  [/^(ernie|wenxin)/i, '百度'],
  [/^hunyuan/i, '腾讯'],
  [/^(yi-|yi$)/i, '零一万物'],
  [/^(minimax|abab)/i, 'MiniMax'],
  [/^(sparkdesk|xinghuo)/i, '讯飞'],
  [/^(command|embed-english|rerank-english)/i, 'Cohere'],
  [/^(jina|jina-)/i, 'Jina'],
]

/** Bucket for models whose vendor cannot be attributed. */
export const OTHER_VENDOR = 'Other'

/**
 * Best-effort vendor attribution for models without `vendor_id`. Returns
 * `null` when the family is unknown, so callers can bucket them as "Other"
 * instead of surfacing noisy name fragments as vendors.
 */
export function inferVendor(model: PricingModel): string | null {
  if (model.vendor_name) return model.vendor_name
  const name = model.model_name
  for (const [pattern, vendor] of VENDOR_PREFIXES) {
    if (pattern.test(name)) return vendor
  }
  return null
}

export function modelInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 2).toUpperCase()
}

/**
 * Stable colour class for the model avatar. Derived from the model id so the
 * same model always gets the same visual treatment across pages.
 */
const AVATAR_TONES = [
  'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  'bg-sky-500/12 text-sky-600 dark:text-sky-400',
  'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  'bg-rose-500/12 text-rose-600 dark:text-rose-400',
  'bg-teal-500/12 text-teal-600 dark:text-teal-400',
]

export function avatarTone(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9973
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}
