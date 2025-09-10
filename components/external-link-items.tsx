'use client'

import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import Link from 'next/link'

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.364 2H21L13.5 10.5 22 22h-6.136l-4.5-6-5.727 6H2l8.727-9.091L2.5 2h6.273l4.227 5.455L18.364 2z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.369A19.91 19.91 0 0016.558 3c-.2.36-.43.84-.594 1.223a12.49 12.49 0 00-4.93 0C10.87 3.84 10.64 3.36 10.44 3a19.91 19.91 0 00-3.759 1.369C3.352 7.079 2.58 9.64 2.75 12.16c1.4 1.04 2.75 1.67 4.09 2.08.33-.46.63-.95.9-1.46-1.02-.39-1.98-.94-2.88-1.67.72.34 1.46.62 2.2.84.47.15.94.27 1.41.37.28.06.56.11.84.15.2.03.39.06.58.08.91.11 1.82.11 2.73 0 .19-.02.38-.05.58-.08.28-.04.56-.09.84-.15.47-.1.94-.22 1.41-.37.74-.22 1.48-.5 2.2-.84-.9.73-1.86 1.28-2.88 1.67.27.51.57 1 .9 1.46 1.34-.41 2.69-1.04 4.09-2.08.23-3.33-.79-5.83-2.763-7.791zM9.545 11.9c-.77 0-1.385.7-1.385 1.56 0 .86.622 1.56 1.385 1.56.765 0 1.38-.7 1.385-1.56.005-.86-.62-1.56-1.385-1.56zm4.91 0c-.77 0-1.385.7-1.385 1.56 0 .86.62 1.56 1.385 1.56.765 0 1.38-.7 1.385-1.56.005-.86-.62-1.56-1.385-1.56z" />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.1 3.29 9.43 7.86 10.96.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.36-1.3-1.72-1.3-1.72-1.06-.73.08-.72.08-.72 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.39.97.1-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.3 1.2-3.11-.12-.29-.52-1.46.11-3.05 0 0 .98-.31 3.2 1.19a11.03 11.03 0 015.83 0c2.22-1.5 3.2-1.19 3.2-1.19.63 1.59.23 2.76.11 3.05.74.81 1.2 1.85 1.2 3.11 0 4.43-2.69 5.41-5.25 5.69.42.37.79 1.1.79 2.22 0 1.6-.01 2.88-.01 3.28 0 .31.21.67.8.56C20.21 21.43 23.5 17.1 23.5 12 23.5 5.73 18.27.5 12 .5z" />
    </svg>
  )
}

const externalLinks = [
  {
    name: 'X',
    href: 'https://x.com/modulexai',
    icon: <XIcon className="mr-2 h-4 w-4" />
  },
  {
    name: 'Discord',
    href: 'https://discord.gg/modulexai',
    icon: <DiscordIcon className="mr-2 h-4 w-4" />
  },
  {
    name: 'GitHub',
    href: 'https://git.new/ModuleXAI',
    icon: <GitHubIcon className="mr-2 h-4 w-4" />
  }
]

export function ExternalLinkItems() {
  return (
    <>
      {externalLinks.map(link => (
        <DropdownMenuItem key={link.name} asChild>
          <Link href={link.href} target="_blank" rel="noopener noreferrer">
            {link.icon}
            <span>{link.name}</span>
          </Link>
        </DropdownMenuItem>
      ))}
    </>
  )
}
