import { api } from '@/lib/api'

import type {
  EnterpriseLeadListData,
  EnterpriseLeadListParams,
  EnterpriseLeadSubmitPayload,
  EnterpriseLeadUpdatePayload,
  ServerResponse,
} from './types'

// Public endpoint used by the storefront contact form.
export async function submitEnterpriseLead(
  payload: EnterpriseLeadSubmitPayload
): Promise<ServerResponse<{ id: number }>> {
  const res = await api.post('/api/enterprise/lead', payload, {
    skipErrorHandler: true,
  })
  return res.data
}

export async function getEnterpriseLeads(
  params: EnterpriseLeadListParams
): Promise<ServerResponse<EnterpriseLeadListData>> {
  const res = await api.get('/api/enterprise/lead', {
    params: {
      p: params.page,
      page_size: params.pageSize,
      keyword: params.keyword || undefined,
      status: params.status,
    },
  })
  return res.data
}

export async function updateEnterpriseLead(
  id: number,
  payload: EnterpriseLeadUpdatePayload
): Promise<ServerResponse<null>> {
  const res = await api.put(`/api/enterprise/lead/${id}`, payload)
  return res.data
}

export async function deleteEnterpriseLead(
  id: number
): Promise<ServerResponse<null>> {
  const res = await api.delete(`/api/enterprise/lead/${id}`)
  return res.data
}
