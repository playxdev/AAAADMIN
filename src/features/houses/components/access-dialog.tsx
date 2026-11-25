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
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { type TKey, useT } from '@/lib/i18n'
import type { Credential, Vehicle } from '@/lib/types'
import { cn, digitsOnly, fmtUtc, plateCategoryChars } from '@/lib/utils'
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
  splitPlate,
  vehicleSchema,
} from '../access-data'
import { BRANDS, PROVINCES } from '../vehicle-options'
import { useColorItems } from './color-items'
import { CredentialEditForm } from './credential-edit-form'

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
  const colorItems = useColorItems()
  const queryClient = useQueryClient()
  const detail = useHouse(houseId)
  const [removing, setRemoving] = useState<Removal>()
  // One-time LINE link codes, per contact.
  const [linkCodes, setLinkCodes] = useState<Record<string, string>>({})
  // QR code saved by the last add (shown bright with a copy button).
  const [qrValue, setQrValue] = useState<string>()
  // PIN saved by the last add (house code + 4 digits), shown once.
  const [pinIssued, setPinIssued] = useState<string>()
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
      label: '',
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

  // Vehicle being edited in the form below the list (undefined = add mode).
  const [editingVehicle, setEditingVehicle] = useState<Vehicle>()
  const [editingCred, setEditingCred] = useState<Credential>()
  const vehicleDefaults = {
    plate_prefix: '',
    plate_number: '',
    province: '',
    brand: '',
    color: '',
    label: '',
  }
  const editVehicle = (v: Vehicle) => {
    const [plate_prefix, plate_number] = splitPlate(v.license_plate)
    setEditingVehicle(v)
    vehicleForm.reset({
      plate_prefix,
      plate_number,
      province: v.province ?? '',
      brand: v.brand ?? '',
      color: v.color ?? '',
      label: v.label ?? '',
    })
  }
  const stopEditingVehicle = () => {
    setEditingVehicle(undefined)
    vehicleForm.reset(vehicleDefaults)
  }
  const addVehicle = useMutation({
    mutationFn: (v: z.input<typeof vehicleSchema>) =>
      editingVehicle
        ? api.patch(
            `/vehicles/${encodeURIComponent(editingVehicle.vehicle_id)}`,
            // Empty fields are omitted; the API stores them as empty (whole vehicle is replaced).
            { ...toVehiclePayload(v), label: v.label.trim() || null }
          )
        : api.post(`/houses/${enc}/vehicles`, toVehiclePayload(v)),
    onSuccess: () => {
      if (editingVehicle) toast.success(t('acc.vehicleUpdated'))
      stopEditingVehicle()
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
      // QR: the form keeps the 20-char part, the API returns house code + it.
      setQrValue(v.cred_type === 'QRCODE' ? v.value : undefined)
      setPinIssued(v.cred_type === 'PIN' ? r.value : undefined)
      // Keep the chosen type so a generated QR value stays on screen.
      credForm.reset({
        cred_type: v.cred_type,
        value: v.cred_type === 'QRCODE' ? v.value : '',
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
  // PIN / QR start with the house code; a house without one cannot have them.
  const houseCode = d?.house_code ?? ''
  const needsCode = (credType === 'PIN' || credType === 'QRCODE') && !houseCode
  const issuer = (c: {
    issued_by_type: string | null
    issued_by_id: string | null
  }) =>
    c.issued_by_type === 'OWNER'
      ? (d?.contacts.find((p) => p.user_id === c.issued_by_id)?.full_name ??
        t('acc.byMember'))
      : t('acc.byAdmin')
  const main = d?.contacts[0]
  const vehicles = d?.vehicles.filter((v) => v.is_active) ?? []
  const creds = d?.credentials.filter((c) => c.is_active) ?? []

  return (
    <Dialog
      open={!!houseId}
      onOpenChange={(o) => {
        if (!o) {
          setLinkCodes({})
          setPinIssued(undefined)
          setEditingVehicle(undefined)
          setEditingCred(undefined)
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
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-2',
                        editingVehicle?.vehicle_id === v.vehicle_id &&
                          'bg-primary/10 ring-1 ring-primary/50 ring-inset'
                      )}
                    >
                      <span className='font-mono font-medium'>
                        {formatPlate(v.license_plate)}
                      </span>
                      {v.label && (
                        <Badge variant='outline' className='font-normal'>
                          {v.label}
                        </Badge>
                      )}
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
                        aria-label={t('common.edit')}
                        disabled={vacant}
                        onClick={() => editVehicle(v)}
                      >
                        <Pencil />
                      </Button>
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
                    className={cn(
                      'grid grid-cols-2 items-start gap-2 md:grid-cols-6',
                      editingVehicle &&
                        'rounded-md border border-primary/40 bg-primary/5 p-3'
                    )}
                  >
                    {editingVehicle && (
                      <p className='col-span-full flex items-center gap-2 text-sm font-medium'>
                        <Pencil className='size-4' />
                        {t('acc.editVehicle', {
                          x: formatPlate(editingVehicle.license_plate),
                        })}
                      </p>
                    )}
                    <TextField
                      control={vehicleForm.control}
                      name='plate_prefix'
                      transform={plateCategoryChars}
                      label={t('acc.platePrefix')}
                      required
                      maxLength={4}
                      placeholder={t('acc.ph.platePrefix')}
                    />
                    <TextField
                      control={vehicleForm.control}
                      name='plate_number'
                      transform={digitsOnly}
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
                        autoComplete='aaa-no-autofill'
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
                      autoComplete='aaa-no-autofill'
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
                      items={colorItems}
                    />
                    {editingVehicle && (
                      <div className='md:col-span-2'>
                        <TextField
                          control={vehicleForm.control}
                          name='label'
                          label={t('acc.label')}
                          maxLength={32}
                          placeholder={t('acc.ph.vehicleLabel')}
                        />
                      </div>
                    )}
                    <div className='col-span-full flex justify-end gap-2'>
                      {editingVehicle && (
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={stopEditingVehicle}
                        >
                          {t('common.cancel')}
                        </Button>
                      )}
                      <Button
                        type='submit'
                        size='sm'
                        variant={editingVehicle ? 'default' : 'success'}
                        disabled={addVehicle.isPending}
                      >
                        {editingVehicle ? (
                          t('common.update')
                        ) : (
                          <>
                            <Plus /> {t('acc.addVehicle')}
                          </>
                        )}
                      </Button>
                    </div>
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
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-2',
                        editingCred?.credential_id === c.credential_id &&
                          'bg-primary/10 ring-1 ring-primary/50 ring-inset'
                      )}
                    >
                      <Badge variant='secondary'>{c.cred_type}</Badge>
                      <span className='flex flex-1 flex-col text-sm'>
                        <span className='font-medium'>{c.label ?? '-'}</span>
                        <span className='text-xs text-muted-foreground'>
                          {issuer(c)} · {fmtUtc(c.valid_from)} →{' '}
                          {c.valid_until
                            ? fmtUtc(c.valid_until)
                            : t('dur.forever')}
                        </span>
                      </span>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={t('common.edit')}
                        onClick={() => setEditingCred(c)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={t('acc.revokeX', { x: c.cred_type })}
                        className='text-destructive hover:text-destructive'
                        onClick={() =>
                          setRemoving({
                            kind: 'credential',
                            id: c.credential_id,
                            label: c.label ?? c.cred_type,
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
              {editingCred && (
                <CredentialEditForm
                  key={editingCred.credential_id}
                  credential={editingCred}
                  onDone={(saved) => {
                    setEditingCred(undefined)
                    if (saved) refresh()
                  }}
                />
              )}
              <Form {...credForm}>
                <fieldset
                  disabled={vacant}
                  className={editingCred ? 'hidden' : 'contents'}
                >
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
                              <span>
                                <span className='text-muted-foreground'>
                                  {houseCode}
                                </span>
                                {draft && <ScrambleCode value={draft} />}
                              </span>
                              {saved && (
                                <CopyButton value={houseCode + draft} />
                              )}
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
                            {credType === 'PIN' ? (
                              <TextField
                                control={credForm.control}
                                name='value'
                                transform={digitsOnly}
                                label={t('acc.pinFor', {
                                  code: houseCode || '-',
                                })}
                                inputMode='numeric'
                                maxLength={4}
                                placeholder={t('acc.ph.pin')}
                              />
                            ) : (
                              <TextField
                                control={credForm.control}
                                name='value'
                                label={t('acc.value')}
                                required
                                maxLength={256}
                              />
                            )}
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
                    {needsCode && (
                      <p className='col-span-full text-sm text-warning'>
                        {t('acc.needsHouseCode')}
                      </p>
                    )}
                    {pinIssued && credType === 'PIN' && (
                      <p
                        className='col-span-full flex items-center gap-1 text-sm'
                        role='status'
                      >
                        {t('acc.pinIssued')}
                        <span className='font-mono text-lg'>{pinIssued}</span>
                        <CopyButton value={pinIssued} />
                      </p>
                    )}
                    <Button
                      type='submit'
                      size='sm'
                      variant='success'
                      className='col-span-full justify-self-end'
                      disabled={addCredential.isPending || needsCode}
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
                      {c.ref && (
                        <span className='font-mono text-xs text-muted-foreground'>
                          {c.ref}
                        </span>
                      )}
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
