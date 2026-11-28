import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { TableId } from '@/components/table-id'
import dayjs from '@/lib/dayjs'

import { toEnterpriseLeadStatus } from '../constants'
import type { EnterpriseLead } from '../types'
import { EnterpriseLeadRowActions } from './enterprise-lead-row-actions'
import { EnterpriseLeadStatusBadge } from './enterprise-lead-status-badge'

type UseEnterpriseLeadsColumnsOptions = {
  onEdit: (lead: EnterpriseLead) => void
  onDelete: (lead: EnterpriseLead) => void
}

export function useEnterpriseLeadsColumns({
  onEdit,
  onDelete,
}: UseEnterpriseLeadsColumnsOptions): ColumnDef<EnterpriseLead>[] {
  const { t } = useTranslation()

  return useMemo(
    (): ColumnDef<EnterpriseLead>[] => [
      {
        accessorKey: 'id',
        header: t('ID'),
        meta: { mobileHidden: true },
        cell: ({ row }) => <TableId value={row.original.id} />,
        size: 60,
      },
      {
        accessorKey: 'company',
        header: t('Company'),
        meta: { mobileTitle: true },
        cell: ({ row }) => {
          const lead = row.original
          return (
            <div className='max-w-full min-w-0'>
              <div className='truncate font-medium'>{lead.company}</div>
              <div className='text-muted-foreground truncate text-xs'>
                {lead.contact_name}
              </div>
            </div>
          )
        },
        size: 180,
      },
      {
        accessorKey: 'email',
        header: t('Work email'),
        cell: ({ row }) => (
          <span className='text-muted-foreground truncate'>
            {row.original.email}
          </span>
        ),
        size: 200,
      },
      {
        accessorKey: 'monthly_tokens',
        header: t('Estimated monthly usage'),
        meta: { mobileHidden: true },
        cell: ({ row }) => (
          <span className='text-muted-foreground'>
            {row.original.monthly_tokens || '-'}
          </span>
        ),
        size: 160,
      },
      {
        accessorKey: 'requirement',
        header: t('Requirements'),
        meta: { mobileHidden: true },
        cell: ({ row }) => {
          const requirement = row.original.requirement
          if (!requirement) {
            return <span className='text-muted-foreground'>-</span>
          }
          return (
            <span
              className='text-muted-foreground line-clamp-2 break-words'
              title={requirement}
            >
              {requirement}
            </span>
          )
        },
        size: 260,
      },
      {
        accessorKey: 'status',
        header: t('Status'),
        meta: { mobileBadge: true },
        cell: ({ row }) => (
          <EnterpriseLeadStatusBadge
            status={toEnterpriseLeadStatus(row.original.status)}
            className='-ml-1.5'
          />
        ),
        size: 140,
      },
      {
        accessorKey: 'remark',
        header: t('Remark'),
        meta: { mobileHidden: true },
        cell: ({ row }) => {
          const remark = row.original.remark
          if (!remark) {
            return <span className='text-muted-foreground'>-</span>
          }
          return (
            <span
              className='text-muted-foreground line-clamp-2 break-words'
              title={remark}
            >
              {remark}
            </span>
          )
        },
        size: 200,
      },
      {
        accessorKey: 'created_time',
        header: t('Submitted'),
        meta: { mobileHidden: true },
        cell: ({ row }) => {
          const createdTime = row.original.created_time
          if (!createdTime) {
            return <span className='text-muted-foreground'>-</span>
          }
          return (
            <span
              className='text-muted-foreground whitespace-nowrap'
              title={dayjs.unix(createdTime).format('YYYY-MM-DD HH:mm:ss')}
            >
              {dayjs.unix(createdTime).fromNow()}
            </span>
          )
        },
        size: 140,
      },
      {
        id: 'actions',
        header: () => t('Actions'),
        cell: ({ row }) => (
          <EnterpriseLeadRowActions
            lead={row.original}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
        meta: { pinned: 'right' as const },
      },
    ],
    [onDelete, onEdit, t]
  )
}
