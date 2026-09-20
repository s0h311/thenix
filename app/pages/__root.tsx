/// <reference types="vite/client" />

import '../index.css'

import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TabBar } from '../components/Shell/TabBar.tsx'
import { BRAND_HEAD_LINKS } from '../libs/Brand/brand.ts'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        // `viewport-fit=cover` is what makes `env(safe-area-inset-*)` anything
        // other than zero, and the tab bar sits on the home indicator without it.
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
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
        <div className='flex min-h-dvh flex-col'>
          <TabBar />
          {/*
           * The bar is fixed over the foot of the screen on a phone, so the
           * screen has to end above it — and above the home indicator under it.
           */}
          <main className='mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-[calc(5.5rem_+_env(safe-area-inset-bottom))] md:pb-8'>
            <Outlet />
          </main>
        </div>
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
