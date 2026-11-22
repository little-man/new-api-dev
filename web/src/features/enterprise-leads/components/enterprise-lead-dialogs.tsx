import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  deleteEnterpriseLead,
  updateEnterpriseLead,
} from '@/features/enterprise-leads/api'
import { handleServerError } from '@/lib/handle-server-error'
import { requireServerSuccess } from '@/lib/server-error-message'

import {
  ENTERPRISE_LEAD_STATUS_OPTIONS,
  ENTERPRISE_LEADS_QUERY_KEY,
} from '../constants'
import type { EnterpriseLeadDialogAction, EnterpriseLeadStatus } from '../types'

type EnterpriseLeadDialogsProps = {
  action: EnterpriseLeadDialogAction | null
  onClose: () => void
}

function buildUpdateSchema(t: ReturnType<typeof useTranslation>['t']) {
  return z.object({
    status: z.number(),
    remark: z.string().trim().max(2000, t('Remark is too long')),
  })
}

type LeadUpdateValues = z.infer<ReturnType<typeof buildUpdateSchema>>

export function EnterpriseLeadDialogs({
  action,
  onClose,
}: EnterpriseLeadDialogsProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const schema = useMemo(() => buildUpdateSchema(t), [t])
  const form = useForm<LeadUpdateValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 0, remark: '' },
  })

  const lead = action?.lead

  useEffect(() => {
    if (!lead) return
    const values: LeadUpdateValues = {
      status: lead.status,
      remark: lead.remark ?? '',
    }
    form.reset(values)
  }, [form, lead])

  const statusItems = useMemo(
    () =>
      ENTERPRISE_LEAD_STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.label),
      })),
    [t]
  )

  const updateMutation = useMutation({
    mutationFn: async (input: { id: number; values: LeadUpdateValues }) =>
      requireServerSuccess(
        await updateEnterpriseLead(input.id, {
          status: input.values.status as EnterpriseLeadStatus,
          remark: input.values.remark,
        })
      ),
    onSuccess: () => {
      toast.success(t('Lead updated successfully'))
      void queryClient.invalidateQueries({
        queryKey: [ENTERPRISE_LEADS_QUERY_KEY],
      })
      onClose()
    },
    onError: (error) => {
      handleServerError(error, t('Failed to update the lead'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      requireServerSuccess(await deleteEnterpriseLead(id)),
    onSuccess: () => {
      toast.success(t('Lead deleted'))
      void queryClient.invalidateQueries({
        queryKey: [ENTERPRISE_LEADS_QUERY_KEY],
      })
      onClose()
    },
    onError: (error) => {
      handleServerError(error, t('Failed to delete the lead'))
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    if (!lead) return
    updateMutation.mutate({ id: lead.id, values })
  })

  return (
    <>
      <Dialog
        open={action?.mode === 'update'}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        title={t('Update lead')}
        description={
          lead ? `${lead.company} · ${lead.contact_name}` : undefined
        }
        contentClassName='sm:max-w-lg'
        footer={
          <>
            <Button variant='outline' onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button onClick={onSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t('Saving...') : t('Save')}
            </Button>
          </>
        }
      >
        <form noValidate onSubmit={onSubmit} className='space-y-4'>
          <div>
            <Label htmlFor='lead-status' className='mb-1.5 block text-sm'>
              {t('Status')}
            </Label>
            <Select
              items={statusItems}
              value={String(form.watch('status'))}
              onValueChange={(value) => form.setValue('status', Number(value))}
            >
              <SelectTrigger id='lead-status' className='w-full'>
                <SelectValue placeholder={t('Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {statusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor='lead-remark' className='mb-1.5 block text-sm'>
              {t('Remark')}
            </Label>
            <Textarea
              id='lead-remark'
              rows={4}
              placeholder={t('Internal notes for this lead')}
              className='resize-none text-sm'
              aria-invalid={!!form.formState.errors.remark}
              {...form.register('remark')}
            />
            {form.formState.errors.remark?.message && (
              <p className='text-destructive mt-1 text-xs'>
                {form.formState.errors.remark.message}
              </p>
            )}
            {lead?.email && (
              <p className='text-muted-foreground mt-2 text-xs'>
                {t('Contact email')}: {lead.email}
              </p>
            )}
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={action?.mode === 'delete'}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        title={t('Delete lead')}
        desc={t(
          'This removes the lead and its notes permanently. The visitor cannot recover it.'
        )}
        destructive
        isLoading={deleteMutation.isPending}
        confirmText={t('Delete')}
        handleConfirm={() => {
          if (!lead) return
          deleteMutation.mutate(lead.id)
        }}
      />
    </>
  )
}
