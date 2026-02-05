import { getFullSlug } from "../../util/path"

// ===== MULTIPLIER FUNCTIONALITY =====

interface IngredientData {
  element: HTMLElement
  originalText: string
  originalHTML: string
  hasQuantities: boolean
}

// Find all quantities in text and return array of matches with positions
const findAllQuantities = (text: string): Array<{ match: string, quantity: number, start: number, end: number }> => {
  const quantities: Array<{ match: string, quantity: number, start: number, end: number }> = []
  
  // Patterns for different quantity formats (without anchors to find all occurrences)
  const patterns = [
    // Decimal numbers: "2.5", "1,5"
    /(\d+[.,]\d+)(?=\s*[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]*(?:\s|$|,|;))/g,
    // Fractions: "1/2", "3/4"
    /(\d+\/\d+)(?=\s*[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]*(?:\s|$|,|;))/g,
    // Ranges: "2-3", "1–2"
    /(\d+[-–]\d+)(?=\s*[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]*(?:\s|$|,|;))/g,
    // Whole numbers: "2", "500"
    /(\d+)(?=\s*[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]*(?:\s|$|,|;))/g
  ]
  
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const quantityStr = match[1]
      let quantity: number
      
      if (quantityStr.includes('/')) {
        const [num, den] = quantityStr.split('/').map(Number)
        quantity = num / den
      } else if (quantityStr.includes('-') || quantityStr.includes('–')) {
        const firstNum = quantityStr.split(/[-–]/)[0]
        quantity = parseFloat(firstNum.replace(',', '.'))
      } else {
        quantity = parseFloat(quantityStr.replace(',', '.'))
      }
      
      const isOverlapping = quantities.some(existing => 
        match!.index < existing.end && match!.index + quantityStr.length > existing.start
      )
      
      if (!isOverlapping && quantity > 0 && match.index !== undefined) {
        quantities.push({
          match: quantityStr,
          quantity,
          start: match.index,
          end: match.index + quantityStr.length
        })
      }
    }
  }
  
  return quantities.sort((a, b) => b.start - a.start)
}

const hasQuantitiesInText = (text: string): boolean => {
  return findAllQuantities(text).length > 0
}

const scaleQuantitiesInText = (text: string, multiplier: number): string => {
  const quantities = findAllQuantities(text)
  let result = text
  
  for (const { match, quantity, start, end } of quantities) {
    const scaledQuantity = quantity * multiplier
    const formattedQuantity = formatQuantity(scaledQuantity, match)
    result = result.substring(0, start) + formattedQuantity + result.substring(end)
  }
  
  return result
}

const formatQuantity = (quantity: number, originalQuantityStr: string): string => {
  if (originalQuantityStr.includes('/')) {
    const decimal = quantity % 1
    if (decimal === 0.5) return `${Math.floor(quantity)}.5`
    if (decimal === 0.25) return `${Math.floor(quantity)}.25`
    if (decimal === 0.75) return `${Math.floor(quantity)}.75`
    if (decimal === 0.33) return `${Math.floor(quantity)}.33`
    if (decimal === 0.67) return `${Math.floor(quantity)}.67`
  }
  
  if (originalQuantityStr.includes('-') || originalQuantityStr.includes('–')) {
    const separator = originalQuantityStr.includes('–') ? '–' : '-'
    const parts = originalQuantityStr.split(new RegExp(`[${separator}]`))
    if (parts.length === 2) {
      const originalFirst = parseFloat(parts[0].replace(',', '.'))
      const originalSecond = parseFloat(parts[1].replace(',', '.'))
      const ratio = originalSecond / originalFirst
      const newSecond = quantity * ratio
      
      const firstFormatted = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1).replace('.', ',')
      const secondFormatted = newSecond % 1 === 0 ? newSecond.toString() : newSecond.toFixed(1).replace('.', ',')
      
      return `${firstFormatted}${separator}${secondFormatted}`
    }
  }
  
  if (quantity % 1 === 0) {
    return quantity.toString()
  } else {
    return quantity.toFixed(1).replace('.', ',')
  }
}

const createMultiplierControl = (): HTMLElement => {
  const container = document.createElement('div')
  container.className = 'ingredient-multiplier'
  container.innerHTML = `
    <div class="multiplier-controls">
      <label for="portion-multiplier">Adag szorzó:</label>
      <div class="multiplier-input-group">
        <button type="button" class="multiplier-btn decrease" aria-label="Csökkentés">−</button>
        <input type="number" id="portion-multiplier" min="0.1" max="10" step="0.1" value="1" />
        <button type="button" class="multiplier-btn increase" aria-label="Növelés">+</button>
      </div>
      <button type="button" class="reset-btn">Visszaállítás</button>
    </div>
  `
  return container
}

const scaleElementRecursively = (element: Element, multiplier: number): void => {
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const nodeText = node.textContent || ''
      if (nodeText.trim() && hasQuantitiesInText(nodeText)) {
        node.textContent = scaleQuantitiesInText(nodeText, multiplier)
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elementNode = node as Element
      // Don't modify links, but do recursively process nested lists and other elements
      if (elementNode.tagName !== 'A') {
        scaleElementRecursively(elementNode, multiplier)
      }
    }
  }
}

const applyMultiplier = (ingredients: IngredientData[], multiplier: number): void => {
  for (let i = 0; i < ingredients.length; i++) {
    const { element, originalText, originalHTML, hasQuantities } = ingredients[i]
    if (hasQuantities) {
      // Reset to original HTML first to prevent compounding
      element.innerHTML = originalHTML
      
      const newText = scaleQuantitiesInText(originalText, multiplier)
      
      // Check if element has any child elements (like links)
      const hasChildElements = element.querySelector('a, span, strong, em, b, i')
      const hasNestedLists = element.querySelector('ul, ol')
      
      if (hasChildElements || hasNestedLists) {
        // Recursively scale all text nodes including nested elements
        scaleElementRecursively(element, multiplier)
      } else {
        // No child elements, safe to replace all text
        element.textContent = newText
      }
    }
  }
}

const resetIngredients = (ingredients: IngredientData[]): void => {
  for (let i = 0; i < ingredients.length; i++) {
    const { element, originalHTML } = ingredients[i]
    // Restore the original HTML structure
    element.innerHTML = originalHTML
    element.classList.remove('ingredient-scaled')
  }
}

// ===== CROSS-OUT FUNCTIONALITY =====

const crossedOutKey = (slug: string) => `${slug}-crossed-ingredients`
const timestampKey = (slug: string) => `${slug}-crossed-ingredients-timestamp`
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

const getIngredientId = (element: HTMLElement, index: number): string => {
  const text = element.textContent?.trim() || ''
  return `ing-${index}-${text.substring(0, 30).replace(/\s/g, '-')}`
}

const isStorageExpired = (slug: string): boolean => {
  const timestamp = localStorage.getItem(timestampKey(slug))
  if (!timestamp) return true
  
  const savedTime = parseInt(timestamp)
  const currentTime = Date.now()
  
  return (currentTime - savedTime) > TWENTY_FOUR_HOURS
}

const clearExpiredStorage = (slug: string): void => {
  if (isStorageExpired(slug)) {
    localStorage.removeItem(crossedOutKey(slug))
    localStorage.removeItem(timestampKey(slug))
  }
}

const getCrossedOutIngredients = (slug: string): Set<string> => {
  if (isStorageExpired(slug)) return new Set()
  
  const stored = localStorage.getItem(crossedOutKey(slug))
  if (!stored) return new Set()
  
  try {
    return new Set(JSON.parse(stored))
  } catch {
    return new Set()
  }
}

const saveCrossedOutIngredients = (slug: string, crossedOut: Set<string>): void => {
  localStorage.setItem(crossedOutKey(slug), JSON.stringify(Array.from(crossedOut)))
  localStorage.setItem(timestampKey(slug), Date.now().toString())
}

// ===== MAIN SCRIPT =====

document.addEventListener("nav", () => {
  const slug = getFullSlug(window)
  const pageSlug = window.document.body.dataset.slug || 
                   window.location.pathname.replace(/^\//, "").replace(/\/$/, "").replace(/\.html$/, "")
  const multiplierKey = `ingredient-multiplier-${pageSlug}`
  
  // Find the ingredients section
  const ingredientsHeader = document.querySelector('h1[id*="hozzávalók"], h1[id*="Hozzávalók"]') as HTMLElement
  if (!ingredientsHeader) return
  
  // Find the next h1 to determine the end of ingredients section
  let nextHeader = ingredientsHeader.nextElementSibling
  while (nextHeader && nextHeader.tagName !== 'H1') {
    nextHeader = nextHeader.nextElementSibling
  }
  
  // Collect all ingredient elements
  const ingredientElements: IngredientData[] = []
  let currentElement = ingredientsHeader.nextElementSibling
  
  while (currentElement && currentElement !== nextHeader) {
    const spans = currentElement.querySelectorAll('span[data-qty-parse]')
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i] as HTMLElement
      const originalText = span.textContent?.trim() || ''
      const originalHTML = span.innerHTML
      const hasQuantities = hasQuantitiesInText(originalText)
      ingredientElements.push({
        element: span,
        originalText,
        originalHTML,
        hasQuantities
      })
    }
    
    if (currentElement.tagName === 'UL' || currentElement.tagName === 'OL') {
      // Get ALL list items including nested ones
      const allListItems = currentElement.querySelectorAll('li')
      
      for (let i = 0; i < allListItems.length; i++) {
        const li = allListItems[i] as HTMLElement
        let directText = ''
        for (const node of li.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            directText += node.textContent || ''
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            if (!['UL', 'OL'].includes(element.tagName)) {
              directText += element.textContent || ''
            }
          }
        }
        
        const originalText = directText.trim()
        if (originalText) {
          const originalHTML = (li as HTMLElement).innerHTML
          const hasQuantities = hasQuantitiesInText(originalText)
          ingredientElements.push({
            element: li,
            originalText,
            originalHTML,
            hasQuantities
          })
        }
      }
    }
    
    if (currentElement.tagName === 'SPAN' && currentElement.hasAttribute('data-qty-parse')) {
      const originalText = currentElement.textContent?.trim() || ''
      const originalHTML = (currentElement as HTMLElement).innerHTML
      const hasQuantities = hasQuantitiesInText(originalText)
      ingredientElements.push({
        element: currentElement as HTMLElement,
        originalText,
        originalHTML,
        hasQuantities
      })
    }
    
    currentElement = currentElement.nextElementSibling
  }
  
  if (ingredientElements.length === 0) return
  
  // Setup cross-out functionality
  clearExpiredStorage(slug)
  const crossedOutIngredients = getCrossedOutIngredients(slug)
  
  // Add data attributes and cursor styles, restore crossed-out state
  for (let index = 0; index < ingredientElements.length; index++) {
    const el = ingredientElements[index].element
    const ingredientId = getIngredientId(el, index)
    
    el.style.cursor = 'pointer'
    el.setAttribute('data-ingredient-id', ingredientId)
    el.setAttribute('data-ingredient-index', index.toString())
    
    if (crossedOutIngredients.has(ingredientId)) {
      el.classList.add('ingredient-crossed-out')
    }
  }
  
  // Event delegation for cross-out clicks
  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement
    const ingredientEl = target.closest('[data-ingredient-id]') as HTMLElement
    
    if (!ingredientEl || target.tagName === 'UL' || target.tagName === 'OL') {
      return
    }
    
    // Check if it's one of our ingredient elements
    let found = false
    for (let i = 0; i < ingredientElements.length; i++) {
      if (ingredientElements[i].element === ingredientEl) {
        found = true
        break
      }
    }
    if (!found) return
    
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
    
    saveCrossedOutIngredients(slug, crossedOutIngredients)
  }
  
  document.body.addEventListener('click', handleClick)
  window.addCleanup?.(() => document.body.removeEventListener('click', handleClick))
  
  // Setup multiplier functionality
  const hasAnyQuantities = ingredientElements.some(ing => ing.hasQuantities)
  if (!hasAnyQuantities) return
  
  const existingMultiplier = document.querySelector('.ingredient-multiplier')
  if (existingMultiplier) {
    existingMultiplier.remove()
  }
  
  const multiplierControl = createMultiplierControl()
  ingredientsHeader.parentNode?.insertBefore(multiplierControl, ingredientsHeader.nextSibling)
  
  const input = multiplierControl.querySelector('#portion-multiplier') as HTMLInputElement
  const decreaseBtn = multiplierControl.querySelector('.decrease') as HTMLButtonElement
  const increaseBtn = multiplierControl.querySelector('.increase') as HTMLButtonElement
  const resetBtn = multiplierControl.querySelector('.reset-btn') as HTMLButtonElement
  
  // Load saved multiplier value
  const savedMultiplier = localStorage.getItem(multiplierKey)
  if (savedMultiplier) {
    const multiplier = parseFloat(savedMultiplier)
    input.value = multiplier.toString()
    if (multiplier !== 1) {
      applyMultiplier(ingredientElements, multiplier)
      multiplierControl.classList.add('multiplier-active')
    }
  }
  
  const updateMultiplier = () => {
    const multiplier = parseFloat(input.value) || 1
    localStorage.setItem(multiplierKey, multiplier.toString())
    
    if (multiplier === 1) {
      resetIngredients(ingredientElements)
      multiplierControl.classList.remove('multiplier-active')
    } else {
      applyMultiplier(ingredientElements, multiplier)
      multiplierControl.classList.add('multiplier-active')
    }
  }
  
  const handleDecrease = () => {
    const currentValue = parseFloat(input.value) || 1
    const newValue = Math.max(0.1, currentValue - 0.1)
    input.value = newValue.toFixed(1)
    updateMultiplier()
  }
  
  const handleIncrease = () => {
    const currentValue = parseFloat(input.value) || 1
    const newValue = Math.min(10, currentValue + 0.1)
    input.value = newValue.toFixed(1)
    updateMultiplier()
  }
  
  const handleReset = () => {
    input.value = '1'
    localStorage.removeItem(multiplierKey)
    resetIngredients(ingredientElements)
    multiplierControl.classList.remove('multiplier-active')
    
    // Also reset all crossed-out ingredients
    for (let i = 0; i < ingredientElements.length; i++) {
      ingredientElements[i].element.classList.remove('ingredient-crossed-out')
    }
    crossedOutIngredients.clear()
    localStorage.removeItem(crossedOutKey(slug))
    localStorage.removeItem(timestampKey(slug))
  }
  
  input.addEventListener('input', updateMultiplier)
  input.addEventListener('change', updateMultiplier)
  decreaseBtn.addEventListener('click', handleDecrease)
  increaseBtn.addEventListener('click', handleIncrease)
  resetBtn.addEventListener('click', handleReset)
  
  window.addCleanup?.(() => {
    input.removeEventListener('input', updateMultiplier)
    input.removeEventListener('change', updateMultiplier)
    decreaseBtn.removeEventListener('click', handleDecrease)
    increaseBtn.removeEventListener('click', handleIncrease)
    resetBtn.removeEventListener('click', handleReset)
  })
})
