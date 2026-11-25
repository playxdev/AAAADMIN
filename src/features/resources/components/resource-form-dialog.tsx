import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/select-dropdown'
import { buildSchema, type ResourceConfig, type Row } from '../config'

type Values = Record<string, string>

type Props = {
  config: ResourceConfig
  currentRow?: Row
  open: boolean
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: Values) => void
}

export function ResourceFormDialog({
  config,
  currentRow,
  open,
  isSaving,
  onOpenChange,
  onSubmit,
}: Props) {
  const isEdit = !!currentRow
  const schema = useMemo(() => buildSchema(config), [config])
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: Object.fromEntries(
      config.fields.map((f) => [f.name, String(currentRow?.[f.name] ?? '')])
    ),
  })
  const singular = config.title.replace(/s$/, '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isEdit ? `Edit ${singular}` : `New ${singular}`}
          </DialogTitle>
          <DialogDescription>Fields marked * are required.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='resource-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            {config.fields.map((f) => (
              <FormField
                key={f.name}
                control={form.control}
                name={f.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {f.label}
                      {f.required && (
                        <span className='text-destructive'>*</span>
                      )}
                    </FormLabel>
                    {f.type === 'select' ? (
                      <SelectDropdown
                        isControlled
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                        items={f.options}
                        placeholder='-- Select --'
                        className='w-full'
                      />
                    ) : (
                      <FormControl>
                        {f.type === 'textarea' ? (
                          <Textarea
                            rows={2}
                            placeholder={f.placeholder}
                            {...field}
                          />
                        ) : (
                          <Input
                            placeholder={f.placeholder}
                            autoComplete='off'
                            {...field}
                          />
                        )}
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='resource-form' disabled={isSaving}>
            {isSaving && <Loader2 className='animate-spin' />}
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
