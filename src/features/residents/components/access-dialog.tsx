import { useState } from 'react'
import { type z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { fmtUtc } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SelectField, TextField } from '@/components/form-fields'
import {
  credentialSchema,
  toCredentialPayload,
  toVehiclePayload,
  useResident,
  vehicleSchema,
} from '../data'

type Removal = { kind: 'vehicle' | 'credential'; id: string; label: string }

/** Vehicles (ANPR), credentials (RFID / QR / PIN) and LINE link code of one resident. */
export function AccessDialog({
  residentId,
  houseLabel,
  onOpenChange,
}: {
  residentId?: string
  houseLabel: string
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const detail = useResident(residentId)
  const [removing, setRemoving] = useState<Removal>()
  const [linkCode, setLinkCode] = useState<string>()
  const enc = encodeURIComponent(residentId ?? '')
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['residents', residentId] })
  const onError = (e: unknown) => toast.error(apiErrorMessage(e))

  const vehicleForm = useForm<z.input<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { license_plate: '', province: '', brand: '', color: '' },
  })
  const credForm = useForm<z.input<typeof credentialSchema>>({
    resolver: zodResolver(credentialSchema),
    defaultValues: { cred_type: 'RFID', value: '', valid_until: '' },
  })

  const addVehicle = useMutation({
    mutationFn: (v: z.input<typeof vehicleSchema>) =>
      api.post(`/residents/${enc}/vehicles`, toVehiclePayload(v)),
    onSuccess: () => {
      vehicleForm.reset()
      refresh()
    },
    onError,
  })
  const addCredential = useMutation({
    mutationFn: (v: z.input<typeof credentialSchema>) =>
      api.post(`/residents/${enc}/credentials`, toCredentialPayload(v)),
    onSuccess: () => {
      credForm.reset()
      refresh()
    },
    onError,
  })
  const remove = useMutation({
    mutationFn: (r: Removal) =>
      api.delete(
        `/${r.kind === 'vehicle' ? 'vehicles' : 'credentials'}/${encodeURIComponent(r.id)}`
      ),
    onSuccess: () => {
      setRemoving(undefined)
      refresh()
    },
    onError,
  })
  const issueLinkCode = useMutation({
    mutationFn: () =>
      api
        .post<{ link_code: string }>(`/residents/${enc}/link-code`)
        .then((r) => r.data),
    // Shown once, valid 24h.
    onSuccess: (r) => {
      setLinkCode(r.link_code)
      toast.success('Link code issued')
    },
    onError,
  })

  const d = detail.data
  const vehicles = d?.vehicles.filter((v) => v.is_active) ?? []
  const creds = d?.credentials.filter((c) => c.is_active) ?? []

  return (
    <Dialog
      open={!!residentId}
      onOpenChange={(o) => {
        if (!o) setLinkCode(undefined)
        onOpenChange(o)
      }}
    >
      <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{d?.full_name ?? 'Loading...'}</DialogTitle>
          <DialogDescription>{houseLabel}</DialogDescription>
        </DialogHeader>
        {detail.isPending ? (
          <Loader2 className='mx-auto animate-spin' />
        ) : detail.isError ? (
          <p className='text-destructive'>{apiErrorMessage(detail.error)}</p>
        ) : (
          <div className='space-y-6'>
            <section className='space-y-3'>
              <h4 className='font-semibold'>Vehicles (ANPR)</h4>
              <ul className='divide-y rounded-md border'>
                {vehicles.length ? (
                  vehicles.map((v) => (
                    <li
                      key={v.vehicle_id}
                      className='flex items-center justify-between gap-2 px-3 py-2'
                    >
                      <span className='font-mono font-medium'>
                        {v.license_plate}
                      </span>
                      <span className='flex-1 text-sm text-muted-foreground'>
                        {[v.province, v.brand, v.color]
                          .filter(Boolean)
                          .join(' · ') || '-'}
                      </span>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={`Remove ${v.license_plate}`}
                        className='text-destructive hover:text-destructive'
                        onClick={() =>
                          setRemoving({
                            kind: 'vehicle',
                            id: v.vehicle_id,
                            label: v.license_plate,
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))
                ) : (
                  <li className='px-3 py-2 text-sm text-muted-foreground'>
                    No vehicles
                  </li>
                )}
              </ul>
              <Form {...vehicleForm}>
                <form
                  onSubmit={vehicleForm.handleSubmit((v) =>
                    addVehicle.mutate(v)
                  )}
                  className='grid grid-cols-2 items-start gap-2 md:grid-cols-4'
                >
                  <TextField
                    control={vehicleForm.control}
                    name='license_plate'
                    label='Plate'
                    required
                    maxLength={32}
                  />
                  <TextField
                    control={vehicleForm.control}
                    name='province'
                    label='Province'
                    maxLength={64}
                  />
                  <TextField
                    control={vehicleForm.control}
                    name='brand'
                    label='Brand'
                    maxLength={64}
                  />
                  <TextField
                    control={vehicleForm.control}
                    name='color'
                    label='Color'
                    maxLength={32}
                  />
                  <Button
                    type='submit'
                    size='sm'
                    className='col-span-2 md:col-span-4'
                    disabled={addVehicle.isPending}
                  >
                    <Plus /> Add Vehicle
                  </Button>
                </form>
              </Form>
            </section>

            <Separator />

            <section className='space-y-3'>
              <h4 className='font-semibold'>Credentials (RFID / QR / PIN)</h4>
              <ul className='divide-y rounded-md border'>
                {creds.length ? (
                  creds.map((c) => (
                    <li
                      key={c.credential_id}
                      className='flex items-center justify-between gap-2 px-3 py-2'
                    >
                      <Badge variant='secondary'>{c.cred_type}</Badge>
                      <span className='flex-1 text-sm'>
                        {fmtUtc(c.valid_from)} → {fmtUtc(c.valid_until)}
                      </span>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={`Revoke ${c.cred_type}`}
                        className='text-destructive hover:text-destructive'
                        onClick={() =>
                          setRemoving({
                            kind: 'credential',
                            id: c.credential_id,
                            label: c.cred_type,
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))
                ) : (
                  <li className='px-3 py-2 text-sm text-muted-foreground'>
                    No credentials
                  </li>
                )}
              </ul>
              <Form {...credForm}>
                <form
                  onSubmit={credForm.handleSubmit((v) =>
                    addCredential.mutate(v)
                  )}
                  className='grid grid-cols-2 items-start gap-2 md:grid-cols-4'
                >
                  <SelectField
                    control={credForm.control}
                    name='cred_type'
                    label='Type'
                    items={['RFID', 'QRCODE', 'PIN'].map((t) => ({
                      label: t,
                      value: t,
                    }))}
                  />
                  <div className='md:col-span-2'>
                    <TextField
                      control={credForm.control}
                      name='value'
                      label='Card no. / QR / PIN'
                      required
                      maxLength={256}
                    />
                  </div>
                  <TextField
                    control={credForm.control}
                    name='valid_until'
                    label='Valid until'
                    type='date'
                  />
                  <Button
                    type='submit'
                    size='sm'
                    className='col-span-2 md:col-span-4'
                    disabled={addCredential.isPending}
                  >
                    <Plus /> Add Credential
                  </Button>
                </form>
              </Form>
            </section>

            <Separator />

            <section className='flex flex-wrap items-center gap-3'>
              <h4 className='font-semibold'>LINE</h4>
              <Button
                variant='outline'
                size='sm'
                onClick={() => issueLinkCode.mutate()}
                disabled={issueLinkCode.isPending}
              >
                Issue LINE link code
              </Button>
              {linkCode && (
                <span className='font-mono text-lg' role='status'>
                  {linkCode}{' '}
                  <span className='text-sm text-muted-foreground'>
                    (shown once, 24h)
                  </span>
                </span>
              )}
            </section>
          </div>
        )}
        <ConfirmDialog
          open={!!removing}
          onOpenChange={(o) => !o && setRemoving(undefined)}
          title={
            removing?.kind === 'vehicle'
              ? 'Remove this vehicle?'
              : 'Revoke this credential?'
          }
          desc={removing?.label ?? ''}
          confirmText={removing?.kind === 'vehicle' ? 'Remove' : 'Revoke'}
          destructive
          isLoading={remove.isPending}
          handleConfirm={() => removing && remove.mutate(removing)}
        />
      </DialogContent>
    </Dialog>
  )
}
