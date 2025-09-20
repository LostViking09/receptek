import { getFullSlug } from "../../util/path"

const orderedListItemId = (index: number, slug: string) => `${slug}-ol-item-${index}`
const activeItemKey = (slug: string) => `${slug}-active-ol-item`
const timestampKey = (slug: string) => `${slug}-active-ol-item-timestamp`

// 24 hours in milliseconds
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

document.addEventListener("nav", () => {
  const slug = getFullSlug(window)
  
  const isStorageExpired = (): boolean => {
    const timestamp = localStorage.getItem(timestampKey(slug))
    if (!timestamp) return true
    
    const savedTime = parseInt(timestamp)
    const currentTime = Date.now()
    
    return (currentTime - savedTime) > TWENTY_FOUR_HOURS
  }

  const clearExpiredStorage = (): void => {
    if (isStorageExpired()) {
      localStorage.removeItem(activeItemKey(slug))
      localStorage.removeItem(timestampKey(slug))
    }
  }

  const setActiveItem = (index: number): void => {
    localStorage.setItem(activeItemKey(slug), index.toString())
    localStorage.setItem(timestampKey(slug), Date.now().toString())
  }

  const clearActiveItem = (): void => {
    localStorage.removeItem(activeItemKey(slug))
    localStorage.removeItem(timestampKey(slug))
  }

  const orderedListItems = document.querySelectorAll(
    "ol li",
  ) as NodeListOf<HTMLLIElement>
  
  // Clear expired storage on page load
  clearExpiredStorage()
  
  orderedListItems.forEach((el, index) => {
    const elId = orderedListItemId(index, slug)

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
        localStorage.removeItem(orderedListItemId(idx, slug))
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
    window.addCleanup?.(() => el.removeEventListener("click", toggleBackground))
  })
  
  // Restore state from localStorage - only one item can be active
  if (!isStorageExpired()) {
    const activeIndex = localStorage.getItem(activeItemKey(slug))
    if (activeIndex !== null) {
      const activeItem = orderedListItems[parseInt(activeIndex)]
      if (activeItem) {
        activeItem.classList.add("clicked")
      }
    }
  }
})
