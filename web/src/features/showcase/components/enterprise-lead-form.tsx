import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitEnterpriseLead } from '@/features/enterprise-leads/api'
import { handleServerError } from '@/lib/handle-server-error'
import { requireServerSuccess } from '@/lib/server-error-message'

const FIELD_CLASS = 'text-sm'

function buildLeadSchema(t: ReturnType<typeof useTranslation>['t']) {
  return z.object({
    company: z
      .string()
      .trim()
      .min(1, t('Company name is required'))
      .max(128, t('Company name is too long')),
    contactName: z
      .string()
      .trim()
      .min(1, t('Contact name is required'))
      .max(64, t('Contact name is too long')),
    email: z
      .email(t('Please enter a valid email address'))
      .max(254, t('Work email is too long')),
    monthlyTokens: z
      .string()
      .trim()
      .max(64, t('Estimated monthly usage is too long')),
    requirement: z.string().trim().max(2000, t('Requirement is too long')),
    consent: z
      .boolean()
      .refine(
        (value) => value,
        t('Please accept the privacy policy to continue')
      ),
  })
}

type LeadFormValues = z.infer<ReturnType<typeof buildLeadSchema>>

const EMPTY_LEAD: LeadFormValues = {
  company: '',
  contactName: '',
  email: '',
  monthlyTokens: '',
  requirement: '',
  consent: false,
}

export function EnterpriseLeadForm() {
  const { t } = useTranslation()
  const schema = useMemo(() => buildLeadSchema(t), [t])
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_LEAD,
  })

  const mutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      const response = requireServerSuccess(
        await submitEnterpriseLead({
          company: values.company,
          contact_name: values.contactName,
          email: values.email,
          monthly_tokens: values.monthlyTokens,
          requirement: values.requirement,
        })
      )
      return response
    },
    onSuccess: () => {
      toast.success(
        t(
          'Thanks! Your request has been recorded. Our team will contact you by email.'
        )
      )
      form.reset(EMPTY_LEAD)
    },
    onError: (error) => {
      handleServerError(
        error,
        t('Failed to submit your request. Please try again.')
      )
    },
  })

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values))
  const errors = form.formState.errors

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className='rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900'
    >
      <h2 className='text-lg font-bold text-slate-900 dark:text-slate-100'>
        {t('Talk to us')}
      </h2>

      <div className='mt-4 grid gap-3 sm:grid-cols-2'>
        <div>
          <Label htmlFor='lead-company' className='mb-1 text-[11.5px]'>
            {t('Company name')} *
          </Label>
          <Input
            id='lead-company'
            autoComplete='organization'
            className={FIELD_CLASS}
            aria-invalid={!!errors.company}
            {...form.register('company')}
          />
          {errors.company?.message && (
            <p className='text-destructive mt-1 text-[11px]'>
              {errors.company.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor='lead-contact' className='mb-1 text-[11.5px]'>
            {t('Contact name')} *
          </Label>
          <Input
            id='lead-contact'
            autoComplete='name'
            className={FIELD_CLASS}
            aria-invalid={!!errors.contactName}
            {...form.register('contactName')}
          />
          {errors.contactName?.message && (
            <p className='text-destructive mt-1 text-[11px]'>
              {errors.contactName.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor='lead-email' className='mb-1 text-[11.5px]'>
            {t('Work email')} *
          </Label>
          <Input
            id='lead-email'
            type='email'
            autoComplete='email'
            className={FIELD_CLASS}
            aria-invalid={!!errors.email}
            {...form.register('email')}
          />
          {errors.email?.message && (
            <p className='text-destructive mt-1 text-[11px]'>
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor='lead-usage' className='mb-1 text-[11.5px]'>
            {t('Estimated monthly usage')}
          </Label>
          <Input
            id='lead-usage'
            placeholder={t('e.g. 50M tokens per month')}
            className={FIELD_CLASS}
            aria-invalid={!!errors.monthlyTokens}
            {...form.register('monthlyTokens')}
          />
          {errors.monthlyTokens?.message && (
            <p className='text-destructive mt-1 text-[11px]'>
              {errors.monthlyTokens.message}
            </p>
          )}
        </div>
      </div>

      <div className='mt-3'>
        <Label htmlFor='lead-requirement' className='mb-1 text-[11.5px]'>
          {t('Requirements')}
        </Label>
        <Textarea
          id='lead-requirement'
          rows={4}
          placeholder={t(
            'Settlement terms, invoice type, whether an SLA is required, etc.'
          )}
          className='resize-none text-sm'
          aria-invalid={!!errors.requirement}
          {...form.register('requirement')}
        />
        {errors.requirement?.message && (
          <p className='text-destructive mt-1 text-[11px]'>
            {errors.requirement.message}
          </p>
        )}
      </div>

      <div className='mt-4'>
        <div className='flex items-start gap-2'>
          <Checkbox
            id='lead-consent'
            checked={form.watch('consent')}
            aria-invalid={!!errors.consent}
            onCheckedChange={(checked) =>
              form.setValue('consent', checked === true, {
                shouldValidate: form.formState.isSubmitted,
              })
            }
          />
          <Label
            htmlFor='lead-consent'
            className='text-[11.5px] leading-relaxed font-normal'
          >
            {t('I agree to the')}{' '}
            <Link
              to='/privacy-policy'
              className='text-blue-600 hover:underline'
            >
              {t('Privacy policy')}
            </Link>
            {t(
              '. We use this information only to reply to your procurement request.'
            )}
          </Label>
        </div>
        {errors.consent?.message && (
          <p className='text-destructive mt-1 text-[11px]'>
            {errors.consent.message}
          </p>
        )}
      </div>

      <div className='mt-4 flex flex-wrap items-center gap-3'>
        <Button type='submit' size='sm' disabled={mutation.isPending}>
          {mutation.isPending ? t('Submitting...') : t('Request a quote')}
        </Button>
        <p className='text-[11px] text-slate-400'>
          {t('Your details are stored only to follow up on this request.')}
        </p>
      </div>
    </form>
  )
}
