import prisma from '@/lib/prisma'
import { AuthorCard } from './AuthorCard'
import { BookCard } from './BookCard'
import { SectionHeading } from './SectionHeading'

export async function AuthorSpotlight() {
  // Find authors who have at least one published book
  const authors = await prisma.user.findMany({
    where: { role: 'Author', authoredBooks: { some: { status: 'published' } } },
    select: { id: true, name: true },
  })

  if (!authors.length) {
    return null
  }

  const picked = authors[Math.floor(Math.random() * authors.length)]

  const books = await prisma.book.findMany({
    where: { authorId: picked.id, status: 'published' },
    orderBy: { updatedAt: 'desc' },
    take: 4,
    select: { id: true, title: true, status: true, author: { select: { name: true } } },
  })

  const bio = `Author of ${books.length} published book${books.length === 1 ? '' : 's'}.`

  return (
    <section id="authors" className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeading title="Author spotlight" subtitle="Meet the creators behind the work." />
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-start">
          <AuthorCard name={picked.name} bio={bio} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {books.map((b) => (
              <BookCard key={b.id} title={b.title} author={b.author.name} status={b.status} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
