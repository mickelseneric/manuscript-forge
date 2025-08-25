import type { Metadata } from 'next'
import { Header } from '@/components/landing/Header'
import { Hero } from '@/components/landing/Hero'
import { LogoStrip } from '@/components/landing/LogoStrip'
import { FeatureCards } from '@/components/landing/FeatureCards'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { BooksCarousel } from '@/components/landing/BooksCarousel'
import { AuthorSpotlight } from '@/components/landing/AuthorSpotlight'
import { Testimonials } from '@/components/landing/Testimonials'
import { StatsAndCTA } from '@/components/landing/StatsAndCTA'
import { FAQ } from '@/components/landing/FAQ'
import { Footer } from '@/components/landing/Footer'

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

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Header />
      <main id="content">
        <Hero />
        <LogoStrip />
        <FeatureCards />
        <HowItWorks />
        <BooksCarousel />
        <AuthorSpotlight />
        <Testimonials />
        <StatsAndCTA />
        <div id="faq"><FAQ /></div>
      </main>
      <Footer />
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
