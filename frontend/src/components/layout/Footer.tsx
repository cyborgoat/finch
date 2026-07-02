import { Link } from "@tanstack/react-router"
import { Mail, MessageCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNewRecordingDialogs } from "@/components/layout/NewRecordingDialogs"
import { cn } from "@/lib/utils"

const APP_VERSION = "0.1.0"

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

const staticProductLinks = [
  { to: "/", labelKey: "nav.home" },
  { to: "/recordings", labelKey: "nav.recordings" },
  { to: "/settings", labelKey: "nav.settings" },
] as const

const dialogProductLinks = [
  { action: "record" as const, labelKey: "nav.recordVoice" },
  { action: "upload" as const, labelKey: "nav.uploadAudio" },
] as const

const resourceLinks = [
  { href: "https://example.com/docs", labelKey: "footer.links.documentation" },
  { href: "https://example.com/quickstart", labelKey: "footer.links.quickstart" },
  { href: "https://example.com/changelog", labelKey: "footer.links.changelog" },
] as const

const contactLinks = [
  {
    href: "mailto:support@example.com",
    labelKey: "footer.contact.supportEmail",
    value: "support@example.com",
  },
  {
    href: "https://github.com/example/finch/issues",
    labelKey: "footer.contact.reportIssue",
    value: "github.com/example/finch",
  },
] as const

const socialLinks = [
  {
    href: "https://github.com/example/finch",
    labelKey: "footer.social.github",
    icon: GitHubIcon,
  },
  {
    href: "mailto:support@example.com",
    labelKey: "footer.social.email",
    icon: Mail,
  },
  {
    href: "https://example.com/community",
    labelKey: "footer.social.community",
    icon: MessageCircle,
  },
] as const

function FooterLinkColumn({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">
        {title}
      </p>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  )
}

function FooterExternalLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </a>
  )
}

export function Footer() {
  const { t } = useTranslation()
  const { openUploadDialog, openRecordDialog } = useNewRecordingDialogs()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto shrink-0 border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-8 py-10 md:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-5">
            <Link to="/" className="inline-flex items-center gap-3 rounded-md transition-opacity hover:opacity-90">
              <img
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-lg object-contain"
              />
              <div className="min-w-0 text-left">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-base font-semibold tracking-tight text-foreground">
                    {t("nav.appName")}
                  </p>
                  <span className="text-xs font-normal text-muted-foreground">
                    {t("footer.version", { version: APP_VERSION })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{t("nav.tagline")}</p>
              </div>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("footer.description")}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socialLinks.map(({ href, labelKey, icon: Icon }) => (
                <a
                  key={labelKey}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(labelKey)}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              {t("footer.copyright", { year })}
            </p>
          </div>

          <FooterLinkColumn title={t("footer.sections.product")} className="lg:col-span-2">
            {staticProductLinks.map(({ to, labelKey }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(labelKey)}
                </Link>
              </li>
            ))}
            {dialogProductLinks.map(({ action, labelKey }) => (
              <li key={action}>
                <button
                  type="button"
                  onClick={action === "record" ? openRecordDialog : openUploadDialog}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(labelKey)}
                </button>
              </li>
            ))}
          </FooterLinkColumn>

          <FooterLinkColumn title={t("footer.sections.resources")} className="lg:col-span-2">
            {resourceLinks.map(({ href, labelKey }) => (
              <li key={labelKey}>
                <FooterExternalLink href={href}>{t(labelKey)}</FooterExternalLink>
              </li>
            ))}
          </FooterLinkColumn>

          <FooterLinkColumn title={t("footer.sections.contact")} className="lg:col-span-3">
            {contactLinks.map(({ href, labelKey, value }) => (
              <li key={labelKey}>
                <p className="text-xs text-muted-foreground">{t(labelKey)}</p>
                <FooterExternalLink href={href}>{value}</FooterExternalLink>
              </li>
            ))}
          </FooterLinkColumn>
        </div>
      </div>
    </footer>
  )
}
