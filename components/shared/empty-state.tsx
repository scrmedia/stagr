import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}

export function EmptyState({ icon: Icon, title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className='flex flex-col items-center justify-center px-6 py-20 text-center'>
      <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-muted'>
        <Icon className='h-8 w-8 text-stagr-amber' />
      </div>
      <h2 className='mt-5 font-heading text-3xl tracking-wide text-foreground'>{title}</h2>
      <p className='mt-2 max-w-xs text-sm text-muted-foreground'>{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className='mt-6 inline-flex min-h-11 items-center rounded-xl bg-stagr-amber px-6 font-semibold text-stagr-night transition-opacity hover:opacity-90'
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}
