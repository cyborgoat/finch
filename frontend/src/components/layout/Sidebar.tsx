import { Link, useRouterState } from "@tanstack/react-router"
import {
  ChevronDown,
  Home,
  Library,
  Mic,
  Plus,
  Settings,
  Upload,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNewRecordingDialogs } from "@/components/layout/NewRecordingDialogs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

function isNavActive(pathname: string, href: string) {
  return (
    pathname === href || (href !== "/" && pathname.startsWith(href))
  )
}

export function AppSidebar() {
  const { t } = useTranslation()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { openUploadDialog, openRecordDialog } = useNewRecordingDialogs()

  const mainLinks = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/recordings", label: t("nav.recordings"), icon: Library },
  ] as const

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link to="/" />}
              tooltip={t("nav.appName")}
            >
              <img
                src="/logo.png"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-lg object-contain"
              />
              <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{t("nav.appName")}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {t("nav.tagline")}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <SidebarMenuButton tooltip={t("nav.new")}>
                        <Plus className="size-4" />
                        <span>{t("nav.new")}</span>
                        <ChevronDown className="ml-auto size-4 opacity-70 group-data-[collapsible=icon]:hidden" />
                      </SidebarMenuButton>
                    }
                  />
                  <DropdownMenuContent
                    align="start"
                    side="right"
                    className="w-48"
                  >
                    <DropdownMenuItem onClick={openRecordDialog}>
                      <Mic className="size-4" />
                      {t("nav.recordVoice")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={openUploadDialog}>
                      <Upload className="size-4" />
                      {t("nav.uploadAudio")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>

              {mainLinks.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    render={<Link to={href} />}
                    isActive={isNavActive(pathname, href)}
                    tooltip={label}
                  >
                    <Icon className="size-4" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link to="/settings" />}
              isActive={isNavActive(pathname, "/settings")}
              tooltip={t("nav.settings")}
            >
              <Settings className="size-4" />
              <span>{t("nav.settings")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
