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
import { useMemo } from 'react'

import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import type { PricingModel } from '@/features/pricing/types'

import {
  avatarTone,
  inferVendor,
  modelInitials,
  modelKind,
  OTHER_VENDOR,
  platformPricePerMillion,
  resolveGroupRatio,
  type ModelKind,
} from '../lib/showcase-pricing'

export type ShowcaseModel = {
  /** `/api/pricing` exposes no numeric id, so the model name is the identity. */
  id: string
  name: string
  vendor: string
  initials: string
  tone: string
  kind: ModelKind
  /** Endpoint types reported by `/api/pricing`; empty when the backend omits them. */
  endpointTypes: string[]
  description?: string
  tags: string[]
  perRequest: boolean
  /** USD per 1M tokens charged by this platform */
  platformInput: number
  platformOutput: number
  /** True when the model can be called without consuming credits */
  free: boolean
}

export type ShowcaseStats = {
  modelCount: number
  vendorCount: number
  kindCount: number
  freeCount: number
}

function parseTags(tags?: string): string[] {
  if (!tags) return []
  return tags
    .split(/[,，|]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 4)
}

function toShowcaseModel(
  model: PricingModel,
  groupRatio: Record<string, number>,
  vendorNames: Map<number, string>
): ShowcaseModel {
  const ratio = resolveGroupRatio(model, groupRatio)
  const platform = platformPricePerMillion(model, ratio)
  const name = model.model_name

  return {
    id: name,
    name,
    vendor:
      (model.vendor_id != null
        ? vendorNames.get(model.vendor_id)
        : undefined) ??
      inferVendor(model) ??
      OTHER_VENDOR,
    initials: modelInitials(name),
    tone: avatarTone(name),
    kind: modelKind(model),
    endpointTypes: model.supported_endpoint_types ?? [],
    description: model.description,
    tags: parseTags(model.tags),
    perRequest: model.quota_type === 1,
    platformInput: platform.input,
    platformOutput: platform.output,
    free: platform.input === 0,
  }
}

/**
 * Model catalogue for the public showcase, derived from `/api/pricing` so the
 * marketing pages and the billing engine never drift apart.
 */
export function useShowcaseModels() {
  const { models, groupRatio, vendors, isLoading, error } = usePricingData()

  const vendorNames = useMemo(() => {
    const map = new Map<number, string>()
    for (const vendor of vendors) {
      map.set(vendor.id, vendor.name)
    }
    return map
  }, [vendors])

  const showcaseModels = useMemo<ShowcaseModel[]>(() => {
    if (!models.length) return []
    return models.map((model) =>
      toShowcaseModel(model, groupRatio, vendorNames)
    )
  }, [models, groupRatio, vendorNames])

  const stats = useMemo<ShowcaseStats>(() => {
    const vendorSet = new Set(showcaseModels.map((model) => model.vendor))
    const kindSet = new Set(showcaseModels.map((model) => model.kind))
    return {
      modelCount: showcaseModels.length,
      vendorCount: vendorSet.size,
      kindCount: kindSet.size,
      freeCount: showcaseModels.filter((model) => model.free).length,
    }
  }, [showcaseModels])

  return { models: showcaseModels, stats, vendors, isLoading, error }
}
