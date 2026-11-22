import type { StatusVariant } from '@/components/status-badge'

import {
  ENTERPRISE_LEAD_STATUS,
  ENTERPRISE_LEAD_STATUS_ORDER,
  type EnterpriseLeadStatus,
} from './types'

type EnterpriseLeadStatusMeta = {
  /** English source text, used as the i18n key. */
  label: string
  variant: StatusVariant
}

/** Prefix shared by every lead list query so mutations can invalidate them all. */
export const ENTERPRISE_LEADS_QUERY_KEY = 'enterprise-leads'

export const ENTERPRISE_LEAD_STATUS_META: Record<
  EnterpriseLeadStatus,
  EnterpriseLeadStatusMeta
> = {
  [ENTERPRISE_LEAD_STATUS.PENDING]: {
    label: 'Pending follow-up',
    variant: 'warning',
  },
  [ENTERPRISE_LEAD_STATUS.CONTACTED]: { label: 'Contacted', variant: 'info' },
  [ENTERPRISE_LEAD_STATUS.WON]: { label: 'Won', variant: 'success' },
  [ENTERPRISE_LEAD_STATUS.CLOSED]: { label: 'Closed', variant: 'neutral' },
}

export const ENTERPRISE_LEAD_STATUS_OPTIONS = ENTERPRISE_LEAD_STATUS_ORDER.map(
  (status) => ({
    value: String(status),
    label: ENTERPRISE_LEAD_STATUS_META[status].label,
  })
)

/**
 * The backend only stores the four known statuses, but rows may come from an
 * older build, so fall back to "pending" instead of rendering an empty badge.
 */
export function toEnterpriseLeadStatus(value: number): EnterpriseLeadStatus {
  const match = ENTERPRISE_LEAD_STATUS_ORDER.find((status) => status === value)
  return match ?? ENTERPRISE_LEAD_STATUS.PENDING
}
