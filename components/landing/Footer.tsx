import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 py-12">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
        <div>
          <div className="font-medium mb-2">Product</div>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-300">
            <li><a href="#features" className="hover:underline">Features</a></li>
            <li><a href="#how" className="hover:underline">How it works</a></li>
            <li><Link href="/dashboard?tab=reader" className="hover:underline">Browse</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Company</div>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-300">
            <li><a href="#authors" className="hover:underline">Authors</a></li>
            <li><a href="#" className="hover:underline">Careers</a></li>
            <li><a href="#" className="hover:underline">Contact</a></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Resources</div>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-300">
            <li><a href="#faq" className="hover:underline">FAQ</a></li>
            <li><a href="#" className="hover:underline">Guides</a></li>
            <li><a href="#" className="hover:underline">Blog</a></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Legal</div>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-300">
            <li><a href="#" className="hover:underline">Privacy</a></li>
            <li><a href="#" className="hover:underline">Terms</a></li>
            <li><a href="#" className="hover:underline">Security</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-8 text-xs text-neutral-500">© {new Date().getFullYear()} Manuscript Forge</div>
    </footer>
  )
}
