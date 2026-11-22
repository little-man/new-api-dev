import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'

import { ENTERPRISE_LEAD_STATUS_META } from '../constants'
import type { EnterpriseLeadStatus } from '../types'

type EnterpriseLeadStatusBadgeProps = {
  status: EnterpriseLeadStatus
  className?: string
}

export function EnterpriseLeadStatusBadge({
  status,
  className,
}: EnterpriseLeadStatusBadgeProps) {
  const { t } = useTranslation()
  const meta = ENTERPRISE_LEAD_STATUS_META[status]

  return (
    <StatusBadge
      label={t(meta.label)}
      variant={meta.variant}
      copyable={false}
      className={className}
    />
  )
}
