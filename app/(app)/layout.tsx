import Link from 'next/link'
import { Home, CalendarDays, ListMusic } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface AppLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/grid', label: 'Grid', icon: CalendarDays },
  { href: '/lineup', label: 'Lineup', icon: ListMusic },
]

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className='flex min-h-screen flex-col'>
      <div className='flex-1 pb-20'>{children}</div>
      <nav className='fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur'>
        <ul className='mx-auto grid max-w-md grid-cols-3'>
          {navItems.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className='flex min-h-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground'
              >
                <Icon className='h-5 w-5' aria-hidden='true' />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
