
import { motion, type HTMLMotionProps } from "motion/react"
import { tabContent, MOTION_DURATION, MOTION_EASE } from "@/lib/motion"
import { cn } from "@/lib/utils"

type BlurFadeProps = HTMLMotionProps<"div"> & {
  delay?: number
}

export function BlurFade({
  className,
  delay = 0,
  children,
  ...props
}: BlurFadeProps) {
  return (
    <motion.div
      initial={tabContent.initial}
      animate={tabContent.animate}
      exit={tabContent.exit}
      transition={{ duration: MOTION_DURATION, ease: MOTION_EASE, delay }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}
