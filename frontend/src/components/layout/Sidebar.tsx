import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { ChevronDown, Mic, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const links = [
  { href: "/", label: "Home" },
  { href: "/files", label: "Files" },
  { href: "/settings", label: "Settings" },
] as const

export function Sidebar() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const navigate = useNavigate()
  const isNewActive = pathname === "/record" || pathname === "/upload"

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card/50 p-4">
      <div className="mb-8 px-2">
        <p className="text-lg font-semibold tracking-tight">Finch</p>
        <p className="text-xs text-muted-foreground">Local voice notes</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              className={cn("mb-4 w-full justify-between", isNewActive && "ring-2 ring-ring")}
              size="sm"
            >
              New
              <ChevronDown className="size-4 opacity-70" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-(--anchor-width)">
          <DropdownMenuItem onClick={() => void navigate({ to: "/record" })}>
            <Mic className="size-4" />
            Record voice
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void navigate({ to: "/upload" })}>
            <Upload className="size-4" />
            Upload audio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
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
