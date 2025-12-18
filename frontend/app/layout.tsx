import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/providers/QueryProvider'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { GlobalErrorHandler } from '@/components/error/GlobalErrorHandler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FleetPass - Vehicle Rental Platform',
  description: 'Car dealership vehicle rental management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <QueryProvider>
            <GlobalErrorHandler />
            {children}
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
