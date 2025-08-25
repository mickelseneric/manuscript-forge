// Placeholder data for the Manuscript Forge landing page
export const logoNames = [
  "Inkline Press",
  "Quill & Co.",
  "Typeset Guild",
  "Gutenberg Studio",
]

export type Book = { id: string; title: string; author: string; status?: "draft"|"editing"|"ready"|"published"; cover?: string }

export const featuredBooks: Book[] = [
  { id: "1", title: "Ink and Ambition", author: "Alice Author", status: "published" },
  { id: "2", title: "Whispers of Ink", author: "Alice Author", status: "draft" },
  { id: "3", title: "Ready for Press", author: "Alice Author", status: "ready" },
  { id: "4", title: "Shadows in Revision", author: "Alice Author", status: "editing" },
  { id: "5", title: "Beyond the Manuscript", author: "Alice Author", status: "published" },
]

export type Author = { id: string; name: string; bio: string; avatar?: string }

export const authors: Author[] = [
  { id: "a1", name: "Alice Author", bio: "Literary fiction with a modern heartbeat." },
  { id: "a2", name: "Evan Editor", bio: "Elevating stories with craft and care." },
]

export const testimonials = [
  { quote: "The clearest editorial workflow I’ve used.", name: "Pam Publisher", role: "Publisher" },
  { quote: "Drafting to publishing felt effortless.", name: "Riley Reader", role: "Reader" },
  { quote: "Collaborate without chaos.", name: "Evan Editor", role: "Editor" },
]

export const faqs = [
  { q: "What is Manuscript Forge?", a: "A collaborative platform for authors, editors, publishers, and readers." },
  { q: "Can I use my existing content?", a: "Yes, you can import drafts and continue collaborating." },
  { q: "How do roles work?", a: "Each role sees relevant stages: Authors draft, Editors review, Publishers release, Readers review." },
  { q: "Is there a free tier?", a: "We offer a generous free tier suitable for individuals and small teams." },
  { q: "Do you support teams?", a: "Yes, team workspaces and notifications keep everyone aligned." },
]

export const stats = [
  { label: "Concurrent users supported", value: "1K+" },
  { label: "Books published", value: "500+" },
  { label: "Reviews", value: "10k+" },
  { label: "Uptime", value: "99.9%" },
]
