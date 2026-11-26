import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Camera, Loader2 } from 'lucide-react'
import { api, apiErrorMessage } from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { AccessLog } from '@/lib/types'
import { fmtUtc } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatPlate } from '@/features/houses/access-data'

type Kind = 'scene' | 'plate'

/** Camera pictures of one gate event (scene + plate close-up), loaded with the admin token. */
export function EventImageDialog({
  log,
  onClose,
}: {
  log?: AccessLog
  onClose: () => void
}) {
  const t = useT()
  const [kind, setKind] = useState<Kind>('scene')
  const img = useQuery({
    queryKey: ['access-log-image', log?.log_id, kind],
    queryFn: () =>
      api
        .get<Blob>(`/access-logs/${encodeURIComponent(log!.log_id)}/image`, {
          params: { kind },
          responseType: 'blob',
        })
        .then((r) => r.data),
    enabled: !!log,
    staleTime: Infinity,
  })
  // Blob -> object URL, revoked when the picture changes or the dialog closes.
  const src = useMemo(
    () => (img.data ? URL.createObjectURL(img.data) : undefined),
    [img.data]
  )
  useEffect(
    () => () => {
      if (src) URL.revokeObjectURL(src)
    },
    [src]
  )

  const kinds: Kind[] = log
    ? [
        ...(log.has_image ? (['scene'] as const) : []),
        ...(log.has_plate_image ? (['plate'] as const) : []),
      ]
    : []

  return (
    <Dialog
      open={!!log}
      onOpenChange={(o) => {
        if (!o) {
          setKind('scene')
          onClose()
        }
      }}
    >
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Camera className='size-5' /> {t('img.title')}
          </DialogTitle>
          {log && (
            <DialogDescription>
              {[
                fmtUtc(log.timestamp),
                log.license_plate ? formatPlate(log.license_plate) : log.method,
                log.house_number,
                log.gate_name,
              ]
                .filter(Boolean)
                .join(' · ')}
            </DialogDescription>
          )}
        </DialogHeader>
        {kinds.length > 1 && (
          <div className='flex gap-2'>
            {kinds.map((k) => (
              <Button
                key={k}
                size='sm'
                variant={kind === k ? 'default' : 'outline'}
                onClick={() => setKind(k)}
              >
                {t(k === 'scene' ? 'img.scene' : 'img.plate')}
              </Button>
            ))}
          </div>
        )}
        <div className='flex min-h-64 items-center justify-center overflow-hidden rounded-md border bg-muted/30'>
          {img.isPending ? (
            <Loader2 className='animate-spin' />
          ) : img.isError ? (
            <p className='p-6 text-sm text-muted-foreground'>
              {apiErrorMessage(img.error, t('img.missing'))}
            </p>
          ) : (
            src && (
              <img
                src={src}
                alt={t(kind === 'scene' ? 'img.scene' : 'img.plate')}
                className='max-h-[70svh] w-full object-contain'
              />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
