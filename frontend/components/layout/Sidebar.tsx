"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const links = [
  { href: "/", label: "Home" },
  { href: "/record", label: "Record" },
  { href: "/upload", label: "Upload" },
  { href: "/transcripts", label: "Transcripts" },
  { href: "/documents", label: "Documents" },
  { href: "/settings", label: "Settings" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card/50 p-4">
      <div className="mb-8 px-2">
        <p className="text-lg font-semibold tracking-tight">Finch</p>
        <p className="text-xs text-muted-foreground">Local voice notes</p>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
              pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href))
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
