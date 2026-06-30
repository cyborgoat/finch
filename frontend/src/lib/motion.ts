export const MOTION_DURATION = 0.2
export const MOTION_EASE = [0.25, 0.1, 0.25, 1] as const

export const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export const tabContent = {
  initial: { opacity: 0, y: 8, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -4, filter: "blur(4px)" },
}

export function listStagger(index: number) {
  return {
    delay: index * 0.03,
    duration: MOTION_DURATION,
    ease: MOTION_EASE,
  }
}
