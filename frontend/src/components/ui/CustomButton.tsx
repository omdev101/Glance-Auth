
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link' | 'primary' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ variant = 'default', size = 'default', children, isLoading, leftIcon, rightIcon, className, ...props }, ref) => {
    const buttonVariant = variant === 'primary' 
      ? 'default'
      : variant === 'success' 
        ? 'default' 
        : variant;

    const buttonClassName = cn({
      'bg-primary hover:bg-primary/90 text-primary-foreground': variant === 'primary',
      'bg-green-600 hover:bg-green-700 text-white': variant === 'success',
      'opacity-70 pointer-events-none': isLoading,
    }, className);

    return (
      <Button
        ref={ref}
        variant={buttonVariant}
        size={size}
        className={cn('font-medium inline-flex justify-center items-center gap-2', buttonClassName)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!isLoading && leftIcon && <span>{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span>{rightIcon}</span>}
      </Button>
    );
  }
);

CustomButton.displayName = 'CustomButton';

export default CustomButton;
