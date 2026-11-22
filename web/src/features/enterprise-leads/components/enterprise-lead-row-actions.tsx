import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import type { EnterpriseLead } from '../types'

type EnterpriseLeadRowActionsProps = {
  lead: EnterpriseLead
  onEdit: (lead: EnterpriseLead) => void
  onDelete: (lead: EnterpriseLead) => void
}

export function EnterpriseLeadRowActions({
  lead,
  onEdit,
  onDelete,
}: EnterpriseLeadRowActionsProps) {
  const { t } = useTranslation()

  return (
    <div className='-ml-1.5 flex items-center gap-1'>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={() => onEdit(lead)}
              aria-label={t('Update status')}
            />
          }
        >
          <Pencil />
        </TooltipTrigger>
        <TooltipContent>{t('Update status')}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={() => onDelete(lead)}
              aria-label={t('Delete')}
              className='text-destructive hover:text-destructive'
            />
          }
        >
          <Trash2 />
        </TooltipTrigger>
        <TooltipContent>{t('Delete')}</TooltipContent>
      </Tooltip>
    </div>
  )
}
