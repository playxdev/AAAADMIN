import { type Control, type FieldValues, type Path } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'

type BaseProps<T extends FieldValues> = {
  control: Control<T>
  name: Path<T>
  label: string
  required?: boolean
}

function Label({ label, required }: { label: string; required?: boolean }) {
  return (
    <FormLabel>
      {label}
      {required && <span className='text-destructive'>*</span>}
    </FormLabel>
  )
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  transform,
  ...input
}: BaseProps<T> &
  Omit<React.ComponentProps<typeof Input>, 'name'> & {
    /** Cleans what is typed / pasted before it reaches the form (e.g. digits only). */
    transform?: (value: string) => string
  }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Label label={label} required={required} />
          <FormControl>
            <Input
              autoComplete='off'
              {...input}
              {...field}
              value={field.value ?? ''}
              onChange={(e) =>
                field.onChange(
                  transform ? transform(e.target.value) : e.target.value
                )
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  items,
  placeholder,
}: BaseProps<T> & {
  items: { label: React.ReactNode; value: string; disabled?: boolean }[]
  placeholder?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Label label={label} required={required} />
          <SelectDropdown
            isControlled
            defaultValue={field.value}
            onValueChange={field.onChange}
            items={items}
            placeholder={placeholder}
            className='w-full'
          />
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
