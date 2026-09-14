import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger-ghost'
  size?: 'sm' | 'default' | 'lg'
  isLoading?: boolean
  children?: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-[0.45rem] px-[0.95rem] py-2',
          'text-[0.875rem] font-medium tracking-[0.005em] leading-[1.25]',
          'border rounded cursor-pointer select-none whitespace-nowrap',
          'transition-all duration-[130ms] ease-in-out',
          'active:translate-y-px',
          
          // Disabled state
          'disabled:opacity-55 disabled:pointer-events-none',
          
          // Loading state
          isLoading && 'pointer-events-none relative text-transparent',
          
          // Variants
          {
            'bg-surface text-ink border-border-strong hover:bg-surface-subtle hover:border-border-strong':
              variant === 'default',
            'bg-primary text-primary-on border-transparent shadow-xs hover:bg-primary-hover hover:text-primary-on hover:border-transparent active:bg-primary-active':
              variant === 'primary',
            'bg-transparent border-transparent text-text-muted hover:bg-surface-subtle hover:text-ink hover:border-transparent':
              variant === 'ghost',
            'bg-transparent border-transparent text-danger hover:bg-danger-subtle hover:text-danger hover:border-transparent':
              variant === 'danger-ghost',
          },
          
          // Sizes
          {
            'px-[0.65rem] py-[0.3rem] text-[0.8125rem] rounded-sm': size === 'sm',
            'px-[1.25rem] py-[0.65rem] text-[0.9375rem] rounded-lg': size === 'lg',
          },
          
          className
        )}
        {...props}
      >
        {isLoading && (
          <span className="absolute inset-0 m-auto w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button