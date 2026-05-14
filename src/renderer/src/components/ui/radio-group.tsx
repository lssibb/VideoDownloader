import * as React from 'react'
import { cn } from '@/lib/utils'

type RadioGroupProps = {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
  name?: string
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, children, name, ...props }, ref) => {
    const baseId = React.useId()
    return (
      <div ref={ref} className={cn('grid gap-2', className)} role="radiogroup" {...props}>
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child
          return React.cloneElement(child as React.ReactElement<RadioGroupItemProps>, {
            groupValue: props.value,
            onValueChange: props.onValueChange,
            groupName: name,
            groupId: baseId
          })
        })}
      </div>
    )
  }
)
RadioGroup.displayName = 'RadioGroup'

type RadioGroupItemProps = {
  value: string
  id?: string
  groupValue?: string
  onValueChange?: (value: string) => void
  groupName?: string
  groupId?: string
  children?: React.ReactNode
  className?: string
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, groupValue, onValueChange, groupName, groupId, children, ...props }, ref) => {
    const inputId = id || `${groupId || React.useId()}-${value}`
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <input
          ref={ref}
          type="radio"
          id={inputId}
          name={groupName}
          value={value}
          checked={groupValue === value}
          onChange={() => onValueChange?.(value)}
          className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
          {...props}
        />
        <label htmlFor={inputId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {children || value}
        </label>
      </div>
    )
  }
)
RadioGroupItem.displayName = 'RadioGroupItem'

export { RadioGroup, RadioGroupItem }
