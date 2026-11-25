import { type z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import type { House, Resident } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { SelectField, TextField } from '@/components/form-fields'
import { residentSchema, toResidentPayload } from '../data'

type FormValues = z.input<typeof residentSchema>

export function ResidentDialog({
  resident,
  houses,
  open,
  onOpenChange,
}: {
  resident?: Resident
  houses: House[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(residentSchema),
    values: {
      full_name: resident?.full_name ?? '',
      house_id: resident?.house_id ?? '',
      phone_number: resident?.phone_number ?? '',
      line_id: resident?.line_id ?? '',
      reactivate: false,
    },
  })
  const save = useMutation({
    mutationFn: (v: FormValues) =>
      resident
        ? api.patch(
            `/residents/${encodeURIComponent(resident.user_id)}`,
            toResidentPayload(v)
          )
        : api.post('/residents', toResidentPayload(v)),
    onSuccess: () => {
      toast.success(resident ? 'Resident updated' : 'Resident created')
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Failed to save')),
  })

  // Active houses, plus the resident's current house even if it was disabled.
  const houseItems = houses
    .filter((h) => h.is_active || h.house_id === resident?.house_id)
    .map((h) => ({
      value: h.house_id,
      label: h.zone_or_soi
        ? `${h.house_number} (${h.zone_or_soi})`
        : h.house_number,
    }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {resident ? 'Edit resident' : 'New resident'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            id='resident-form'
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
            className='space-y-4'
          >
            <TextField
              control={form.control}
              name='full_name'
              label='Full Name'
              required
              maxLength={128}
            />
            <SelectField
              control={form.control}
              name='house_id'
              label='House'
              required
              items={houseItems}
              placeholder='-- select house --'
            />
            <TextField
              control={form.control}
              name='phone_number'
              label='Phone Number'
              maxLength={32}
            />
            <TextField
              control={form.control}
              name='line_id'
              label='Line ID'
              maxLength={64}
            />
            {resident && !resident.is_active && (
              <FormField
                control={form.control}
                name='reactivate'
                render={({ field }) => (
                  <FormItem className='flex items-center gap-2'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(c) => field.onChange(c === true)}
                      />
                    </FormControl>
                    <FormLabel>Re-activate resident</FormLabel>
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='resident-form' disabled={save.isPending}>
            {save.isPending && <Loader2 className='animate-spin' />}
            {resident ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
