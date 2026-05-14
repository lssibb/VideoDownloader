import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => (
    <div className={cn('flex items-center space-x-2', className)}>
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        {...props}
      />
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
    </div>
  )
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
