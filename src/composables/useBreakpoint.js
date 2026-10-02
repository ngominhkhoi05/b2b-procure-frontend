/**
 * useBreakpoint — reactive viewport breakpoint composable.
 *
 * Exposes `isMobile`, `isTablet`, `isDesktop` based on window.matchMedia.
 *
 * Breakpoints (matching the responsive design rules in the Phase 3 spec):
 *   - mobile:  < 640 px
 *   - tablet:  640 px  – 1023 px
 *   - desktop: >= 1024 px
 *
 * SSR-safe: returns false for all flags when window is unavailable.
 */

import { ref, onMounted, onBeforeUnmount, readonly } from 'vue'

const MOBILE_MAX = 639
const TABLET_MAX = 1023

export function useBreakpoint() {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(true)

  let mqlMobile = null
  let mqlTablet = null

  function update() {
    if (typeof window === 'undefined') return
    const width = window.innerWidth
    isMobile.value = width <= MOBILE_MAX
    isTablet.value = width > MOBILE_MAX && width <= TABLET_MAX
    isDesktop.value = width > TABLET_MAX
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    mqlMobile = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`)
    mqlTablet = window.matchMedia(`(min-width: ${MOBILE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`)

    update()

    if (mqlMobile.addEventListener) {
      mqlMobile.addEventListener('change', update)
      mqlTablet.addEventListener('change', update)
    } else {
      // Safari < 14 fallback
      mqlMobile.addListener(update)
      mqlTablet.addListener(update)
    }
  })

  onBeforeUnmount(() => {
    if (!mqlMobile || !mqlTablet) return
    if (mqlMobile.removeEventListener) {
      mqlMobile.removeEventListener('change', update)
      mqlTablet.removeEventListener('change', update)
    } else {
      mqlMobile.removeListener(update)
      mqlTablet.removeListener(update)
    }
  })

  return {
    isMobile: readonly(isMobile),
    isTablet: readonly(isTablet),
    isDesktop: readonly(isDesktop),
  }
}
