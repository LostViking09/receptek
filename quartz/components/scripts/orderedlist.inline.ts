import { getFullSlug } from "../../util/path"

const orderedListItemId = (index: number) => `${getFullSlug(window)}-ol-item-${index}`
const activeItemKey = `${getFullSlug(window)}-active-ol-item`
const timestampKey = `${getFullSlug(window)}-active-ol-item-timestamp`

// 24 hours in milliseconds
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

const isStorageExpired = (): boolean => {
  const timestamp = localStorage.getItem(timestampKey)
  if (!timestamp) return true
  
  const savedTime = parseInt(timestamp)
  const currentTime = Date.now()
  
  return (currentTime - savedTime) > TWENTY_FOUR_HOURS
}

const clearExpiredStorage = (): void => {
  if (isStorageExpired()) {
    localStorage.removeItem(activeItemKey)
    localStorage.removeItem(timestampKey)
  }
}

const setActiveItem = (index: number): void => {
  localStorage.setItem(activeItemKey, index.toString())
  localStorage.setItem(timestampKey, Date.now().toString())
}

const clearActiveItem = (): void => {
  localStorage.removeItem(activeItemKey)
  localStorage.removeItem(timestampKey)
}

document.addEventListener("nav", () => {
  const orderedListItems = document.querySelectorAll(
    "ol li",
  ) as NodeListOf<HTMLLIElement>
  
  // Clear expired storage on page load
  clearExpiredStorage()
  
  orderedListItems.forEach((el, index) => {
    const elId = orderedListItemId(index)

    const toggleBackground = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      
      const target = e.target as HTMLLIElement
      const isClicked = target.classList.contains("clicked")
      
      // Remove clicked class from all ordered list items
      orderedListItems.forEach(item => {
        item.classList.remove("clicked")
      })
      
      // Clear all individual item storage
      orderedListItems.forEach((_, idx) => {
        localStorage.removeItem(orderedListItemId(idx))
      })
      
      if (!isClicked) {
        // Add clicked class to the current item
        target.classList.add("clicked")
        setActiveItem(index)
      } else {
        // If clicking the same item, remove the active state
        clearActiveItem()
      }
    }

    el.addEventListener("click", toggleBackground)
    window.addCleanup(() => el.removeEventListener("click", toggleBackground))
  })
  
  // Restore state from localStorage - only one item can be active
  if (!isStorageExpired()) {
    const activeIndex = localStorage.getItem(activeItemKey)
    if (activeIndex !== null) {
      const activeItem = orderedListItems[parseInt(activeIndex)]
      if (activeItem) {
        activeItem.classList.add("clicked")
      }
    }
  }
})
