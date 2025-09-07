'use client'

import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Laptop, Moon, Palette, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeMenuItems() {
  const { setTheme } = useTheme()

  return (
    <>
      <DropdownMenuItem onClick={() => setTheme('light')}>
        <Sun className="mr-2 h-4 w-4" />
        <span>Light</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme('dark')}>
        <Moon className="mr-2 h-4 w-4" />
        <span>Dark</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme('metal')}>
        <Palette className="mr-2 h-4 w-4" />
        <span>Metal</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme('system')}>
        <Laptop className="mr-2 h-4 w-4" />
        <span>System</span>
      </DropdownMenuItem>
    </>
  )
}
