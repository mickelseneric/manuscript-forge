import type { Metadata } from 'next'
import prisma from '@/lib/prisma'
import { Header } from '@/components/landing/Header'
import { Hero } from '@/components/landing/Hero'
import { LogoStrip } from '@/components/landing/LogoStrip'
import { FeatureCards } from '@/components/landing/FeatureCards'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { BooksCarousel, type FeaturedBook } from '@/components/landing/BooksCarousel'
import { AuthorSpotlight } from '@/components/landing/AuthorSpotlight'
import { Testimonials } from '@/components/landing/Testimonials'
import { Stats } from '@/components/landing/Stats'
import { FAQ } from '@/components/landing/FAQ'

export const metadata: Metadata = {
  title: 'Manuscript Forge — Publish better books',
  description: 'Draft, collaborate, and publish with clarity. A Printpress-inspired workspace for authors, editors, publishers, and readers.',
  openGraph: {
    title: 'Manuscript Forge — Publish better books',
    description: 'Draft, collaborate, and publish with clarity.',
    type: 'website',
    url: 'https://example.com/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manuscript Forge — Publish better books',
    description: 'Draft, collaborate, and publish with clarity.',
  },
}

async function getFeaturedBooks(): Promise<FeaturedBook[]> {
  const books = await prisma.book.findMany({
    where: { status: 'published' },
    orderBy: { updatedAt: 'desc' },
    take: 12,
    select: { id: true, title: true, status: true, author: { select: { name: true } } },
  })
  return books.map((b) => ({ id: b.id, title: b.title, status: b.status as FeaturedBook['status'], author: b.author.name }))
}

export default async function Home() {
  const featured = await getFeaturedBooks()
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Header />
      <main id="content">
        <Hero />
        <LogoStrip />
        <FeatureCards />
        <HowItWorks />
        <BooksCarousel books={featured} />
        <AuthorSpotlight />
        <Testimonials />
        <Stats />
        <div id="faq"><FAQ /></div>
      </main>
      {/* Organization JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Manuscript Forge',
        url: 'https://example.com/',
      }) }} />
    </div>
  )
}
