"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { fadeUp, MOTION_DURATION, MOTION_EASE } from "@/lib/motion"

type EmptyStateProps = {
  title: string
  description?: string
  className?: string
}

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="relative mb-4 flex size-12 items-center justify-center">
        <span className="absolute inset-0 animate-pulse rounded-full bg-primary/10" />
        <span className="relative size-2 rounded-full bg-muted-foreground/40" />
        <span className="absolute size-8 rounded-full border border-border/80" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </motion.div>
  )
}
