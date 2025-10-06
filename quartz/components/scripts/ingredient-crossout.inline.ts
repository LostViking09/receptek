import { getFullSlug } from "../../util/path"

;(() => {
  const crossedOutKey = (slug: string) => `${slug}-crossed-ingredients`
  const timestampKey = (slug: string) => `${slug}-crossed-ingredients-timestamp`

  // 24 hours in milliseconds
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

  // Generate a unique ID for an ingredient element
  const getIngredientId = (element: HTMLElement, index: number): string => {
    // Use the element's text content and index to create a stable ID
    const text = element.textContent?.trim() || ''
    return `ing-${index}-${text.substring(0, 30).replace(/\s/g, '-')}`
  }

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
      localStorage.removeItem(crossedOutKey(slug))
      localStorage.removeItem(timestampKey(slug))
    }
  }

  const getCrossedOutIngredients = (): Set<string> => {
    if (isStorageExpired()) return new Set()
    
    const stored = localStorage.getItem(crossedOutKey(slug))
    if (!stored) return new Set()
    
    try {
      return new Set(JSON.parse(stored))
    } catch {
      return new Set()
    }
  }

  const saveCrossedOutIngredients = (crossedOut: Set<string>): void => {
    localStorage.setItem(crossedOutKey(slug), JSON.stringify(Array.from(crossedOut)))
    localStorage.setItem(timestampKey(slug), Date.now().toString())
  }

  // Find the ingredients section
  const ingredientsHeader = document.querySelector('h1[id*="hozzávalók"], h1[id*="Hozzávalók"]') as HTMLElement
  if (!ingredientsHeader) return
  
  // Find the next h1 to determine the end of ingredients section
  let nextHeader = ingredientsHeader.nextElementSibling
  while (nextHeader && nextHeader.tagName !== 'H1') {
    nextHeader = nextHeader.nextElementSibling
  }
  
  // Collect all ingredient elements (spans and list items)
  const ingredientElements: HTMLElement[] = []
  let currentElement = ingredientsHeader.nextElementSibling
  
  while (currentElement && currentElement !== nextHeader) {
    // Handle spans with data-qty-parse
    const spans = currentElement.querySelectorAll('span[data-qty-parse]')
    for (let i = 0; i < spans.length; i++) {
      ingredientElements.push(spans[i] as HTMLElement)
    }
    
    // Handle list items
    if (currentElement.tagName === 'UL' || currentElement.tagName === 'OL') {
      const allListItems = currentElement.querySelectorAll('li')
      for (let i = 0; i < allListItems.length; i++) {
        ingredientElements.push(allListItems[i] as HTMLElement)
      }
    }
    
    // Also check if the current element itself is a span with data-qty-parse
    if (currentElement.tagName === 'SPAN' && currentElement.hasAttribute('data-qty-parse')) {
      ingredientElements.push(currentElement as HTMLElement)
    }
    
    currentElement = currentElement.nextElementSibling
  }
  
  if (ingredientElements.length === 0) return
  
  // Clear expired storage on page load
  clearExpiredStorage()
  
  // Get currently crossed-out ingredients
  const crossedOutIngredients = getCrossedOutIngredients()
  
  // Add data attributes and cursor styles
  for (let index = 0; index < ingredientElements.length; index++) {
    const el = ingredientElements[index]
    const ingredientId = getIngredientId(el, index)
    
    el.style.cursor = 'pointer'
    el.setAttribute('data-ingredient-id', ingredientId)
    el.setAttribute('data-ingredient-index', index.toString())
    
    // Restore state from localStorage
    if (crossedOutIngredients.has(ingredientId)) {
      el.classList.add('ingredient-crossed-out')
    }
  }
  
  // Use event delegation on the document body for better compatibility
  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement
    
    // Find the closest ingredient element
    let ingredientEl = target.closest('[data-ingredient-id]') as HTMLElement
    
    // Don't process if clicking on nested lists
    if (!ingredientEl || target.tagName === 'UL' || target.tagName === 'OL') {
      return
    }
    
    // Make sure it's one of our ingredient elements
    if (ingredientElements.indexOf(ingredientEl) === -1) {
      return
    }
    
    e.stopPropagation()
    
    const ingredientId = ingredientEl.getAttribute('data-ingredient-id')
    if (!ingredientId) return
    
    const isCrossedOut = ingredientEl.classList.contains('ingredient-crossed-out')
    
    if (isCrossedOut) {
      ingredientEl.classList.remove('ingredient-crossed-out')
      crossedOutIngredients.delete(ingredientId)
    } else {
      ingredientEl.classList.add('ingredient-crossed-out')
      crossedOutIngredients.add(ingredientId)
    }
    
    saveCrossedOutIngredients(crossedOutIngredients)
  }
  
  document.body.addEventListener('click', handleClick)
  window.addCleanup?.(() => document.body.removeEventListener('click', handleClick))
  })
})()
