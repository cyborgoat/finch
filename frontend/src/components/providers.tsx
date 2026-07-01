import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@/components/I18nProvider"
import "@/i18n"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <I18nProvider>{children}</I18nProvider>
      <Toaster position="top-center" />
    </TooltipProvider>
  )
}
