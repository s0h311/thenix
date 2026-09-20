/// <reference types="vite/client" />

import '../index.css'

import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppHeader } from '../components/AppHeader.tsx'
import { BRAND_HEAD_LINKS } from '../libs/Brand/brand.ts'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'thenix',
      },
    ],
    links: BRAND_HEAD_LINKS,
  }),
  component: RootComponent,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

function RootComponent() {
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <AppHeader />
        <main className='mx-auto max-w-3xl px-4 py-6'>
          <Outlet />
        </main>
      </QueryClientProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang='en'>
      <head>
        <HeadContent />
      </head>
      <body className='min-h-dvh bg-page text-body text-ink antialiased'>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
