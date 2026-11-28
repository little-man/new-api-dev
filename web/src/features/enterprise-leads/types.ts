export const ENTERPRISE_LEAD_STATUS = {
  PENDING: 0,
  CONTACTED: 1,
  WON: 2,
  CLOSED: 3,
} as const

export type EnterpriseLeadStatus =
  (typeof ENTERPRISE_LEAD_STATUS)[keyof typeof ENTERPRISE_LEAD_STATUS]

export const ENTERPRISE_LEAD_STATUS_ORDER: EnterpriseLeadStatus[] = [
  ENTERPRISE_LEAD_STATUS.PENDING,
  ENTERPRISE_LEAD_STATUS.CONTACTED,
  ENTERPRISE_LEAD_STATUS.WON,
  ENTERPRISE_LEAD_STATUS.CLOSED,
]

export interface EnterpriseLead {
  id: number
  company: string
  contact_name: string
  email: string
  monthly_tokens: string
  requirement: string
  status: EnterpriseLeadStatus
  remark: string
  user_id: number
  created_time: number
  updated_time: number
}

export interface EnterpriseLeadSubmitPayload {
  company: string
  contact_name: string
  email: string
  monthly_tokens: string
  requirement: string
}

export interface EnterpriseLeadListParams {
  page: number
  pageSize: number
  keyword: string
  /** Undefined means "every status". */
  status?: EnterpriseLeadStatus
}

export interface EnterpriseLeadListData {
  page: number
  page_size: number
  total: number
  items: EnterpriseLead[] | null
}

export interface EnterpriseLeadUpdatePayload {
  status?: EnterpriseLeadStatus
  remark?: string
}

export interface EnterpriseLeadDialogAction {
  mode: 'update' | 'delete'
  lead: EnterpriseLead
}

export interface ServerResponse<T> {
  success: boolean
  message: string
  data: T
}
