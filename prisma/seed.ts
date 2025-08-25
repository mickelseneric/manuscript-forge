import { PrismaClient, BookStatus, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Manuscript Forge demo data...')

  // 1) Upsert core users
  const usersData = [
    { email: 'author@example.com', name: 'Alice Author', role: UserRole.Author },
    { email: 'editor@example.com', name: 'Evan Editor', role: UserRole.Editor },
    { email: 'publisher@example.com', name: 'Pam Publisher', role: UserRole.Publisher },
    { email: 'reader@example.com', name: 'Riley Reader', role: UserRole.Reader },
  ] as const

  const [author, editor, publisher, reader] = await Promise.all(
    usersData.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role },
        create: { email: u.email, name: u.name, role: u.role },
      })
    )
  )

  // 2) Seed books only if there are none, to keep idempotency simple
  const existingBooks = await prisma.book.count()
  if (existingBooks === 0) {
    console.log('No books found. Creating demo books across all states...')

    const booksToCreate = [
      // Drafts owned by Author
      { title: 'The Unseen Outline', content: 'Draft content...', status: BookStatus.draft, authorId: author.id },
      { title: 'Whispers of Ink', content: 'Draft content...', status: BookStatus.draft, authorId: author.id },

      // In editing with assigned Editor
      { title: 'Shadows in Revision', content: 'Editing content...', status: BookStatus.editing, authorId: author.id, editorId: editor.id },
      { title: 'Margins and Notes', content: 'Editing content...', status: BookStatus.editing, authorId: author.id, editorId: editor.id },

      // Ready with assigned Publisher (and typically an Editor too)
      { title: 'Ready for Press', content: 'Ready content...', status: BookStatus.ready, authorId: author.id, editorId: editor.id, publisherId: publisher.id },

      // Published with Editor and Publisher set
      { title: 'Ink and Ambition', content: 'Published content...', status: BookStatus.published, authorId: author.id, editorId: editor.id, publisherId: publisher.id },
      { title: 'Beyond the Manuscript', content: 'Published content...', status: BookStatus.published, authorId: author.id, editorId: editor.id, publisherId: publisher.id },
    ]

    const createdBooks = [] as { id: string; title: string; status: BookStatus }[]

    for (const b of booksToCreate) {
      const created = await prisma.book.create({
        data: {
          title: b.title,
          content: b.content,
          status: b.status,
          author: { connect: { id: b.authorId } },
          editor: b.editorId ? { connect: { id: b.editorId } } : undefined,
          publisher: b.publisherId ? { connect: { id: b.publisherId } } : undefined,
        },
        select: { id: true, title: true, status: true },
      })
      createdBooks.push(created)
    }

    // 3) Add reviews by the Reader to published books
    const publishedBooks = createdBooks.filter((b) => b.status === BookStatus.published)

    for (const book of publishedBooks) {
      await prisma.review.create({
        data: {
          book: { connect: { id: book.id } },
          reader: { connect: { id: reader.id } },
          rating: 5,
          body: `An excellent read: ${book.title}`,
        },
      })

      await prisma.review.create({
        data: {
          book: { connect: { id: book.id } },
          reader: { connect: { id: reader.id } },
          rating: 4,
          body: `Enjoyed the narrative arc in ${book.title}.`,
        },
      })
    }

    console.log(`Created ${createdBooks.length} books and ${publishedBooks.length * 2} reviews.`)
  } else {
    console.log('Books already exist. Skipping book and review creation to keep seed idempotent.')
  }

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
