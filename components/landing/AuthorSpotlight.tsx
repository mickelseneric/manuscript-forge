import { authors, featuredBooks } from './data'
import { AuthorCard } from './AuthorCard'
import { BookCard } from './BookCard'
import { SectionHeading } from './SectionHeading'

export function AuthorSpotlight() {
  const author = authors[0]
  const books = featuredBooks.slice(0, 4)
  return (
    <section id="authors" className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeading title="Author spotlight" subtitle="Meet the creators behind the work." />
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-start">
          <AuthorCard name={author.name} bio={author.bio} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {books.map((b) => (
              <BookCard key={b.id} title={b.title} author={b.author} status={b.status} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
