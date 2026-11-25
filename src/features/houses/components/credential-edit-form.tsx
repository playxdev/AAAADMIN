import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { k, useT } from '@/lib/i18n'
import type { Credential } from '@/lib/types'
import { endOfDayUtc } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { SelectField, TextField } from '@/components/form-fields'
import { DURATIONS } from '@/features/visitors/data'

// keep = leave the validity as is (only the short name changes).
const schema = z
  .object({
    label: z.string().trim().max(32),
    duration: z.enum(['keep', ...DURATIONS, 'custom']),
    valid_until: z.string(),
  })
  .refine((v) => v.duration !== 'custom' || v.valid_until !== '', {
    message: k('v.date'),
    path: ['valid_until'],
  })

type Values = z.infer<typeof schema>

/** Edit a credential's short name / validity (the house names items in the LINE app; admin can do it for them). The code itself cannot change. */
export function CredentialEditForm({
  credential,
  onDone,
}: {
  credential: Credential
  onDone: (saved: boolean) => void
}) {
  const t = useT()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: credential.label ?? '',
      duration: 'keep',
      valid_until: '',
    },
  })
  const duration = useWatch({ control: form.control, name: 'duration' })
  const save = useMutation({
    mutationFn: (v: Values) =>
      api.patch(
        `/credentials/${encodeURIComponent(credential.credential_id)}`,
        {
          label: v.label.trim() || null,
          ...(v.duration === 'custom'
            ? { valid_until: endOfDayUtc(v.valid_until) }
            : v.duration !== 'keep' && { duration: v.duration }),
        }
      ),
    onSuccess: () => {
      toast.success(t('acc.credUpdated'))
      onDone(true)
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('err.save'))),
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => save.mutate(v))}
        className='grid grid-cols-2 items-start gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 md:grid-cols-4'
      >
        <p className='col-span-full flex items-center gap-2 text-sm font-medium'>
          <Pencil className='size-4' />
          {t('acc.editCred', { x: credential.label ?? credential.cred_type })}
        </p>
        <div className='md:col-span-2'>
          <TextField
            control={form.control}
            name='label'
            label={t('acc.label')}
            maxLength={32}
            placeholder={t('acc.ph.credLabel')}
          />
        </div>
        <SelectField
          control={form.control}
          name='duration'
          label={t('vis.duration')}
          items={(['keep', ...DURATIONS, 'custom'] as const).map((d) => ({
            value: d,
            label: t(d === 'keep' ? 'acc.keepDuration' : `dur.${d}`),
          }))}
        />
        {duration === 'custom' && (
          <TextField
            control={form.control}
            name='valid_until'
            label={t('acc.validUntil')}
            type='date'
            required
          />
        )}
        <div className='col-span-full flex justify-end gap-2'>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => onDone(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button type='submit' size='sm' disabled={save.isPending}>
            {save.isPending && <Loader2 className='animate-spin' />}
            {t('common.update')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
