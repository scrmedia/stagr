'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Radio, LayoutGrid, ListMusic, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/home', label: 'Live', icon: Radio },
  { href: '/grid', label: 'Grid', icon: LayoutGrid },
  { href: '/lineup', label: 'Lineup', icon: ListMusic },
  { href: '/festival/new', label: 'Add', icon: Plus },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className='fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur'>
      <ul className='mx-auto grid max-w-md grid-cols-4'>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/festival/new' && pathname.startsWith(href))
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  isActive ? 'text-stagr-amber' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className='h-5 w-5' aria-hidden='true' strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
