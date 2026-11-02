/// <reference types="vite/client" />

import '../index.css'

import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FootBar } from '../components/Shell/FootBar.tsx'
import { TabBar } from '../components/Shell/TabBar.tsx'
import { useServiceWorkerRegistration } from '../components/Shell/useServiceWorkerRegistration.ts'
import { useUpdate } from '../components/Shell/useUpdate.ts'
import { SaveContext, useSaving } from '../components/Training/useSaving.ts'
import { BRAND_HEAD_LINKS, BRAND_HEAD_META, THEME_COLOR_DARK, THEME_COLOR_LIGHT } from '../libs/Brand/brand.ts'

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
      ...BRAND_HEAD_META,
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
  const registration = useServiceWorkerRegistration()

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <Shell registration={registration} />
      </QueryClientProvider>
    </RootDocument>
  )
}

/**
 * Everything that outlives a screen. Moving between routes never unmounts this, which
 * is what keeps Unsaved Logs through a trip to `/sign-in` and the bar on every screen.
 */
function Shell({ registration }: Readonly<{ registration: ServiceWorkerRegistration | null }>) {
  const { updateWaiting, reload } = useUpdate(registration)
  const { save, bar, retry, dismiss } = useSaving({ updateWaiting })

  return (
    <SaveContext.Provider value={save}>
      <div className='flex min-h-dvh flex-col'>
        <TabBar />
        {/*
         * The bar is fixed over the foot of the screen on a phone, so the
         * screen has to end above it — and above the home indicator under it.
         */}
        <main className='mx-auto w-full max-w-3xl flex-1 px-4 pt-[calc(1.5rem_+_env(safe-area-inset-top))] pb-[calc(5.5rem_+_env(safe-area-inset-bottom))] md:pt-6 md:pb-8'>
          <Outlet />
          <FootBar
            bar={bar}
            onRetry={retry}
            onDismiss={dismiss}
            onReload={reload}
          />
        </main>
      </div>
    </SaveContext.Provider>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang='en'>
      <head>
        <HeadContent />
        {/* Written here because route `head` keeps only one meta per name, which
            would silently drop one of the two schemes. */}
        <meta
          name='theme-color'
          media='(prefers-color-scheme: light)'
          content={THEME_COLOR_LIGHT}
        />
        <meta
          name='theme-color'
          media='(prefers-color-scheme: dark)'
          content={THEME_COLOR_DARK}
        />
      </head>
      <body className='min-h-dvh bg-page text-body text-ink antialiased'>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
