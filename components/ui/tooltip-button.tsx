'use client'

import { Button, ButtonProps } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from '@/components/ui/tooltip'
import * as React from 'react'

interface TooltipButtonProps extends ButtonProps {
  /**
   * The tooltip content to display.
   * Can be a string or TooltipContent props.
   */
  tooltipContent: string | Omit<React.ComponentPropsWithoutRef<typeof TooltipContent>, 'children'> & {
    children: React.ReactNode
  }
  /**
   * The content of the button.
   */
  children: React.ReactNode
}

/**
 * A button component with a tooltip.
 */
export const TooltipButton = React.forwardRef<
  HTMLButtonElement,
  TooltipButtonProps
>(({ tooltipContent, children, ...buttonProps }, ref) => {
  const tooltipProps =
    typeof tooltipContent === 'string'
      ? { children: <p>{tooltipContent}</p> }
      : tooltipContent

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex pointer-events-auto z-10" role="button">
          <Button ref={ref} {...buttonProps} className={(buttonProps.className || '') + ' pointer-events-auto'}>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent {...tooltipProps} />
    </Tooltip>
  )
})

TooltipButton.displayName = 'TooltipButton'
