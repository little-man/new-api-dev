import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTablePage, useDataTable } from '@/components/data-table'
import { SectionPageLayout } from '@/components/layout'
import { getEnterpriseLeads } from '@/features/enterprise-leads/api'
import { EnterpriseLeadDialogs } from '@/features/enterprise-leads/components/enterprise-lead-dialogs'
import { useEnterpriseLeadsColumns } from '@/features/enterprise-leads/components/use-enterprise-leads-columns'
import {
  ENTERPRISE_LEAD_STATUS_OPTIONS,
  ENTERPRISE_LEADS_QUERY_KEY,
  toEnterpriseLeadStatus,
} from '@/features/enterprise-leads/constants'
import type {
  EnterpriseLead,
  EnterpriseLeadDialogAction,
  EnterpriseLeadStatus,
} from '@/features/enterprise-leads/types'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { requireServerSuccess } from '@/lib/server-error-message'

const route = getRouteApi('/_authenticated/enterprise-leads/')

function getLeadStatusFilter(
  columnFilters: { id: string; value: unknown }[]
): EnterpriseLeadStatus | undefined {
  const filter = columnFilters.find((item) => item.id === 'status')
  if (!Array.isArray(filter?.value) || filter.value.length === 0) {
    return undefined
  }
  const [first] = filter.value
  const parsed = Number(first)
  if (!Number.isInteger(parsed)) return undefined
  return toEnterpriseLeadStatus(parsed)
}

export function EnterpriseLeads() {
  const { t } = useTranslation()
  const searchParams = route.useSearch()
  const navigate = route.useNavigate()
  const [action, setAction] = useState<EnterpriseLeadDialogAction | null>(null)

  const handleEdit = useCallback((lead: EnterpriseLead) => {
    setAction({ mode: 'update', lead })
  }, [])

  const handleDelete = useCallback((lead: EnterpriseLead) => {
    setAction({ mode: 'delete', lead })
  }, [])

  const columns = useEnterpriseLeadsColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
  })

  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search: searchParams,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 20 },
    globalFilter: { enabled: false },
    columnFilters: [
      { columnId: 'company', searchKey: 'keyword', type: 'string' },
      { columnId: 'status', searchKey: 'status', type: 'array' },
    ],
  })

  const keywordFilter = columnFilters.find((item) => item.id === 'company')
  const keyword =
    typeof keywordFilter?.value === 'string' ? keywordFilter.value : ''
  const status = getLeadStatusFilter(columnFilters)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      ENTERPRISE_LEADS_QUERY_KEY,
      pagination.pageIndex + 1,
      pagination.pageSize,
      keyword,
      status ?? null,
    ],
    queryFn: async () =>
      requireServerSuccess(
        await getEnterpriseLeads({
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          keyword,
          status,
        })
      ).data,
    placeholderData: (previousData) => previousData,
  })

  const leads = useMemo(() => data?.items ?? [], [data])

  const { table } = useDataTable({
    data: leads,
    columns,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    manualPagination: true,
    manualFiltering: true,
    totalCount: data?.total ?? 0,
    ensurePageInRange,
    autoResetPageIndex: false,
  })

  const statusFilterOptions = useMemo(
    () =>
      ENTERPRISE_LEAD_STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.label),
      })),
    [t]
  )

  return (
    <>
      <SectionPageLayout fixedContent>
        <SectionPageLayout.Title>
          {t('Enterprise Leads')}
        </SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <DataTablePage
            table={table}
            columns={columns}
            isLoading={isLoading}
            isFetching={isFetching}
            emptyTitle={t('No enterprise leads yet')}
            emptyDescription={t(
              'Requests submitted through the storefront contact form will appear here.'
            )}
            skeletonKeyPrefix='enterprise-leads-skeleton'
            applyHeaderSize
            toolbarProps={{
              searchPlaceholder: t('Search company, contact or email'),
              searchKey: 'company',
              searchDebounceMs: 300,
              collapsibleOnMobile: true,
              filters: [
                {
                  columnId: 'status',
                  title: t('Status'),
                  options: statusFilterOptions,
                  singleSelect: true,
                },
              ],
            }}
          />
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <EnterpriseLeadDialogs action={action} onClose={() => setAction(null)} />
    </>
  )
}
