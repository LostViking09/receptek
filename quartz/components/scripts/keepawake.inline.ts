let wakeLock: WakeLockSentinel | null = null
let isWakeLockSupported = false

// Check if the Wake Lock API is supported
if ("wakeLock" in navigator) {
  isWakeLockSupported = true
}

const emitWakeLockChangeEvent = (isActive: boolean) => {
  const event = new CustomEvent("wakelockchange", {
    detail: { isActive },
  })
  document.dispatchEvent(event)
}

const requestWakeLock = async () => {
  if (!isWakeLockSupported) {
    console.warn("Wake Lock API is not supported in this browser")
    return
  }

  try {
    wakeLock = await navigator.wakeLock.request("screen")
    localStorage.setItem("wakeLockActive", "true")
    emitWakeLockChangeEvent(true)
    
    // Listen for wake lock release
    wakeLock.addEventListener("release", () => {
      localStorage.setItem("wakeLockActive", "false")
      emitWakeLockChangeEvent(false)
    })
  } catch (err) {
    console.error("Failed to request wake lock:", err)
  }
}

const releaseWakeLock = async () => {
  if (wakeLock) {
    await wakeLock.release()
    wakeLock = null
    localStorage.setItem("wakeLockActive", "false")
    emitWakeLockChangeEvent(false)
  }
}

// Initialize wake lock state from localStorage
const savedWakeLockState = localStorage.getItem("wakeLockActive") === "true"

document.addEventListener("nav", () => {
  const toggleWakeLock = async () => {
    if (!isWakeLockSupported) {
      alert("Wake Lock API is not supported in this browser. This feature requires a modern mobile browser.")
      return
    }

    if (wakeLock && !wakeLock.released) {
      await releaseWakeLock()
    } else {
      await requestWakeLock()
    }
  }

  // Update button state based on current wake lock status
  const updateButtonState = () => {
    const isActive = wakeLock && !wakeLock.released
    for (const button of document.getElementsByClassName("keepawake")) {
      if (isActive) {
        button.setAttribute("data-active", "true")
      } else {
        button.removeAttribute("data-active")
      }
    }
  }

  for (const keepAwakeButton of document.getElementsByClassName("keepawake")) {
    // Hide button if not supported
    if (!isWakeLockSupported) {
      (keepAwakeButton as HTMLElement).style.display = "none"
      continue
    }

    keepAwakeButton.addEventListener("click", toggleWakeLock)
    window.addCleanup(() => keepAwakeButton.removeEventListener("click", toggleWakeLock))
  }

  // Restore wake lock state if it was active before
  if (savedWakeLockState && isWakeLockSupported) {
    requestWakeLock()
  }

  // Listen for wake lock changes to update button state
  document.addEventListener("wakelockchange", updateButtonState)
  window.addCleanup(() => document.removeEventListener("wakelockchange", updateButtonState))

  // Initial state update
  updateButtonState()

  // Re-request wake lock when page becomes visible (in case it was released)
  const handleVisibilityChange = async () => {
    if (document.visibilityState === "visible" && savedWakeLockState && isWakeLockSupported) {
      if (!wakeLock || wakeLock.released) {
        await requestWakeLock()
      }
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange)
  window.addCleanup(() => document.removeEventListener("visibilitychange", handleVisibilityChange))
})
