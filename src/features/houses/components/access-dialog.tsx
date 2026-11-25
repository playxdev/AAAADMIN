import { useEffect, useState } from 'react'
import { type z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Car,
  Dices,
  IdCard,
  KeyRound,
  Loader2,
  MessageCircle,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { type TKey, useT } from '@/lib/i18n'
import { cn, fmtUtc } from '@/lib/utils'
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
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { SelectField, TextField } from '@/components/form-fields'
import { ScrambleCode } from '@/components/scramble-code'
import { DURATIONS } from '@/features/visitors/data'
import {
  credentialSchema,
  defaultDuration,
  randomQrCode,
  toCredentialPayload,
  toVehiclePayload,
  useHouse,
  formatPlate,
  vehicleSchema,
} from '../access-data'
import { BRANDS, COLORS, PROVINCES } from '../vehicle-options'

// shortcut: plain 4 random digits; the house-number prefix format is pending with SEMA.
// PIN is unique per project (API returns CREDENTIAL_EXISTS on a clash), so just roll again.
const randomPin = () =>
  String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0')

type Removal = { kind: 'vehicle' | 'credential'; id: string; label: string }

/** Access methods of one house: vehicles (ANPR), credentials (RFID / QR / PIN) and LINE links of its contacts. */
export function AccessDialog({
  houseId,
  onOpenChange,
}: {
  houseId?: string
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const detail = useHouse(houseId)
  const [removing, setRemoving] = useState<Removal>()
  // One-time LINE link codes, per contact.
  const [linkCodes, setLinkCodes] = useState<Record<string, string>>({})
  // QR code saved by the last add (shown bright with a copy button).
  const [qrValue, setQrValue] = useState<string>()
  const enc = encodeURIComponent(houseId ?? '')
  // ['houses'] also refreshes the list (contacts / counts).
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['houses'] })
  const onError = (e: unknown) => toast.error(apiErrorMessage(e))

  const vehicleForm = useForm<z.input<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate_prefix: '',
      plate_number: '',
      province: '',
      brand: '',
      color: '',
    },
  })
  const credForm = useForm<z.input<typeof credentialSchema>>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      cred_type: 'RFID',
      value: '',
      duration: defaultDuration('RFID'),
      valid_until: '',
    },
  })

  const addVehicle = useMutation({
    mutationFn: (v: z.input<typeof vehicleSchema>) =>
      api.post(`/houses/${enc}/vehicles`, toVehiclePayload(v)),
    onSuccess: () => {
      vehicleForm.reset()
      refresh()
    },
    onError,
  })
  const credType = useWatch({
    control: credForm.control,
    name: 'cred_type',
  })
  const duration = useWatch({ control: credForm.control, name: 'duration' })
  // Each type has its own sensible default (RFID forever, PIN / QR 1 day).
  const draft = useWatch({ control: credForm.control, name: 'value' })
  useEffect(() => {
    credForm.setValue('duration', defaultDuration(credType))
    // QR: the code is generated here and shown openly; saving sends this exact code.
    credForm.setValue('value', credType === 'QRCODE' ? randomQrCode() : '')
  }, [credForm, credType])
  // Saved = the code on screen is the one the last add stored.
  const saved = credType === 'QRCODE' && !!qrValue && draft === qrValue
  const addCredential = useMutation({
    mutationFn: (v: z.input<typeof credentialSchema>) =>
      api
        .post<{
          value?: string
        }>(`/houses/${enc}/credentials`, toCredentialPayload(v))
        .then((r) => r.data),
    // QRCODE: the generated value is returned only once.
    // A new QR value starts scrambling again until the API answers.
    onSuccess: (r, v) => {
      setQrValue(r.value)
      // Keep the chosen type so a generated QR value stays on screen.
      credForm.reset({
        cred_type: v.cred_type,
        // QR: keep the saved code on screen; other types start empty.
        value: r.value ?? '',
        duration: defaultDuration(v.cred_type),
        valid_until: '',
      })
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
    mutationFn: (userId: string) =>
      api
        .post<{
          user_id: string
          link_code: string
        }>(`/contacts/${encodeURIComponent(userId)}/link-code`)
        .then((r) => r.data),
    // Shown once, valid 24h.
    onSuccess: (r) => {
      setLinkCodes((m) => ({ ...m, [r.user_id]: r.link_code }))
      toast.success(t('acc.linkIssued'))
    },
    onError,
  })

  const d = detail.data
  const vacant = d?.occupancy_status === 'VACANT'
  const main = d?.contacts[0]
  const vehicles = d?.vehicles.filter((v) => v.is_active) ?? []
  const creds = d?.credentials.filter((c) => c.is_active) ?? []

  return (
    <Dialog
      open={!!houseId}
      onOpenChange={(o) => {
        if (!o) {
          setLinkCodes({})
          setQrValue(undefined)
        }
        onOpenChange(o)
      }}
    >
      <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <KeyRound className='size-5' />
            {d ? t('acc.title', { n: d.house_number }) : t('common.loading')}
          </DialogTitle>
          <DialogDescription>
            {main
              ? [main.full_name, main.phone_number].filter(Boolean).join(' · ')
              : t('houses.noContact')}
          </DialogDescription>
        </DialogHeader>
        {detail.isPending ? (
          <Loader2 className='mx-auto animate-spin' />
        ) : detail.isError ? (
          <p className='text-destructive'>{apiErrorMessage(detail.error)}</p>
        ) : (
          <div className='space-y-6'>
            {vacant && (
              <p
                role='alert'
                className='flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm'
              >
                <TriangleAlert className='size-4 shrink-0 text-warning' />
                {t('acc.vacant')}
              </p>
            )}
            <section className='space-y-3'>
              <h4 className='flex items-center gap-2 font-semibold'>
                <Car className='size-4' /> {t('acc.vehicles')}
              </h4>
              <ul className='divide-y rounded-md border'>
                {vehicles.length ? (
                  vehicles.map((v) => (
                    <li
                      key={v.vehicle_id}
                      className='flex items-center justify-between gap-2 px-3 py-2'
                    >
                      <span className='font-mono font-medium'>
                        {formatPlate(v.license_plate)}
                      </span>
                      <span className='flex-1 text-sm text-muted-foreground'>
                        {[
                          v.province,
                          v.brand,
                          // Unknown (free-text) colors show as stored.
                          v.color && t(`color.${v.color}` as TKey),
                        ]
                          .filter(Boolean)
                          .join(' · ') || '-'}
                      </span>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={t('acc.removeX', {
                          x: formatPlate(v.license_plate),
                        })}
                        className='text-destructive hover:text-destructive'
                        onClick={() =>
                          setRemoving({
                            kind: 'vehicle',
                            id: v.vehicle_id,
                            label: formatPlate(v.license_plate),
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))
                ) : (
                  <li className='px-3 py-2 text-sm text-muted-foreground'>
                    {t('acc.noVehicles')}
                  </li>
                )}
              </ul>
              <Form {...vehicleForm}>
                <fieldset disabled={vacant} className='contents'>
                  <form
                    onSubmit={vehicleForm.handleSubmit((v) =>
                      addVehicle.mutate(v)
                    )}
                    className='grid grid-cols-2 items-start gap-2 md:grid-cols-6'
                  >
                    <TextField
                      control={vehicleForm.control}
                      name='plate_prefix'
                      label={t('acc.platePrefix')}
                      required
                      maxLength={4}
                      placeholder={t('acc.ph.platePrefix')}
                    />
                    <TextField
                      control={vehicleForm.control}
                      name='plate_number'
                      label={t('acc.plateNumber')}
                      required
                      inputMode='numeric'
                      maxLength={4}
                      placeholder='1234'
                    />
                    <div className='md:col-span-2'>
                      <TextField
                        control={vehicleForm.control}
                        name='province'
                        label={t('acc.province')}
                        maxLength={64}
                        list='vehicle-provinces'
                      />
                    </div>
                    <datalist id='vehicle-provinces'>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                    <TextField
                      control={vehicleForm.control}
                      name='brand'
                      label={t('acc.brand')}
                      maxLength={64}
                      list='vehicle-brands'
                    />
                    <datalist id='vehicle-brands'>
                      {BRANDS.map(([value, th]) => (
                        <option key={value} value={value} label={th} />
                      ))}
                    </datalist>
                    <SelectField
                      control={vehicleForm.control}
                      name='color'
                      label={t('acc.color')}
                      items={Object.entries(COLORS).map(([code, hex]) => ({
                        value: code,
                        label: (
                          <span className='flex items-center gap-2'>
                            <span
                              className='size-3.5 rounded-full border border-border'
                              style={{ backgroundColor: hex }}
                            />
                            {t(`color.${code}` as TKey)}
                          </span>
                        ),
                      }))}
                    />
                    <Button
                      type='submit'
                      size='sm'
                      variant='success'
                      className='col-span-full justify-self-end'
                      disabled={addVehicle.isPending}
                    >
                      <Plus /> {t('acc.addVehicle')}
                    </Button>
                  </form>
                </fieldset>
              </Form>
            </section>

            <Separator />

            <section className='space-y-3'>
              <h4 className='flex items-center gap-2 font-semibold'>
                <IdCard className='size-4' /> {t('acc.creds')}
              </h4>
              <ul className='divide-y rounded-md border'>
                {creds.length ? (
                  creds.map((c) => (
                    <li
                      key={c.credential_id}
                      className='flex items-center justify-between gap-2 px-3 py-2'
                    >
                      <Badge variant='secondary'>{c.cred_type}</Badge>
                      <span className='flex-1 text-sm'>
                        {fmtUtc(c.valid_from)} →{' '}
                        {c.valid_until
                          ? fmtUtc(c.valid_until)
                          : t('dur.forever')}
                      </span>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={t('acc.revokeX', { x: c.cred_type })}
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
                    {t('acc.noCreds')}
                  </li>
                )}
              </ul>
              <Form {...credForm}>
                <fieldset disabled={vacant} className='contents'>
                  <form
                    onSubmit={credForm.handleSubmit((v) =>
                      addCredential.mutate(v)
                    )}
                    className='grid grid-cols-2 items-start gap-2 md:grid-cols-4'
                  >
                    <SelectField
                      control={credForm.control}
                      name='cred_type'
                      label={t('acc.type')}
                      items={['RFID', 'QRCODE', 'PIN'].map((v) => ({
                        label: v,
                        value: v,
                      }))}
                    />
                    <div className='md:col-span-2'>
                      {credType === 'QRCODE' ? (
                        <div className='space-y-2'>
                          <Label>{t('acc.value')}</Label>
                          <div className='flex items-center gap-1'>
                            <div
                              className={cn(
                                'flex h-9 flex-1 items-center justify-between gap-1 rounded-md border ps-3 font-mono text-sm tracking-wider',
                                saved
                                  ? 'border-success/40 bg-success/10'
                                  : 'bg-muted/30'
                              )}
                            >
                              {draft && <ScrambleCode value={draft} />}
                              {saved && <CopyButton value={draft} />}
                            </div>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              aria-label={t('acc.randomQr')}
                              title={t('acc.randomQr')}
                              onClick={() =>
                                credForm.setValue('value', randomQrCode())
                              }
                            >
                              <Dices />
                            </Button>
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            {t(saved ? 'acc.qrOnce' : 'acc.qrAuto')}
                          </p>
                        </div>
                      ) : (
                        <div className='flex items-start gap-1'>
                          <div className='flex-1'>
                            <TextField
                              control={credForm.control}
                              name='value'
                              label={t('acc.value')}
                              required
                              maxLength={256}
                            />
                          </div>
                          {credType === 'PIN' && (
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='mt-[1.375rem]'
                              aria-label={t('acc.randomPin')}
                              title={t('acc.randomPin')}
                              onClick={() =>
                                credForm.setValue('value', randomPin(), {
                                  shouldValidate: true,
                                })
                              }
                            >
                              <Dices />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className='space-y-2'>
                      <SelectField
                        control={credForm.control}
                        name='duration'
                        label={t('vis.duration')}
                        items={[...DURATIONS, 'custom' as const].map((d) => ({
                          value: d,
                          label: t(`dur.${d}`),
                        }))}
                      />
                      {duration === 'custom' && (
                        <TextField
                          control={credForm.control}
                          name='valid_until'
                          label={t('acc.validUntil')}
                          type='date'
                          required
                        />
                      )}
                    </div>
                    <Button
                      type='submit'
                      size='sm'
                      variant='success'
                      className='col-span-full justify-self-end'
                      disabled={addCredential.isPending}
                    >
                      <Plus /> {t('acc.addCred')}
                    </Button>
                  </form>
                </fieldset>
              </Form>
            </section>

            <Separator />

            <section className='space-y-3'>
              <h4 className='flex items-center gap-2 font-semibold'>
                <MessageCircle className='size-4' /> LINE
              </h4>
              <ul className='divide-y rounded-md border'>
                {d?.contacts.length ? (
                  d.contacts.map((c) => (
                    <li
                      key={c.user_id}
                      className='flex flex-wrap items-center gap-2 px-3 py-2'
                    >
                      <span className='font-medium'>{c.full_name}</span>
                      <Badge variant='secondary'>{t(`role.${c.role}`)}</Badge>
                      <span className='flex-1' />
                      {linkCodes[c.user_id] ? (
                        <span
                          className='flex items-center gap-1 font-mono'
                          role='status'
                        >
                          {linkCodes[c.user_id]}
                          <CopyButton value={linkCodes[c.user_id]} />
                          <span className='text-xs text-muted-foreground'>
                            {t('acc.shownOnce')}
                          </span>
                        </span>
                      ) : (
                        <>
                          {!!c.line_linked && (
                            <Badge className='bg-success text-white'>
                              {t('acc.lineLinked')}
                            </Badge>
                          )}
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => issueLinkCode.mutate(c.user_id)}
                            disabled={issueLinkCode.isPending}
                          >
                            {t('acc.issueLink')}
                          </Button>
                        </>
                      )}
                    </li>
                  ))
                ) : (
                  <li className='px-3 py-2 text-sm text-muted-foreground'>
                    {t('houses.noContact')}
                  </li>
                )}
              </ul>
            </section>
          </div>
        )}
        <ConfirmDialog
          open={!!removing}
          onOpenChange={(o) => !o && setRemoving(undefined)}
          title={
            removing?.kind === 'vehicle'
              ? t('acc.removeVehicle')
              : t('acc.revokeCred')
          }
          desc={removing?.label ?? ''}
          confirmText={t(
            removing?.kind === 'vehicle' ? 'common.remove' : 'common.revoke'
          )}
          destructive
          isLoading={remove.isPending}
          handleConfirm={() => removing && remove.mutate(removing)}
        />
      </DialogContent>
    </Dialog>
  )
}
