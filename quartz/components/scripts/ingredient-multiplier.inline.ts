import { getFullSlug } from "../../util/path"

const multiplierKey = `${getFullSlug(window)}-ingredient-multiplier`

interface IngredientData {
  element: HTMLElement
  originalText: string
  quantity: number | null
  unit: string
  ingredient: string
}

// Parse quantity from text (supports decimals, fractions, and ranges)
const parseQuantity = (text: string): { quantity: number | null, unit: string, ingredient: string } => {
  // Remove leading dash and whitespace
  const cleanText = text.replace(/^[-\s]*/, '')
  
  // Patterns for different quantity formats
  const patterns = [
    // Decimal numbers: "2.5 kg", "1.5 dl"
    /^(\d+[.,]\d+)\s*([a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]*)\s*(.+)$/,
    // Whole numbers: "2 kg", "5 db"
    /^(\d+)\s*([a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]*)\s*(.+)$/,
    // Fractions: "1/2 kg", "3/4 dl"
    /^(\d+\/\d+)\s*([a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]*)\s*(.+)$/,
    // Ranges: "2-3 db", "1-2 kg"
    /^(\d+[-–]\d+)\s*([a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]*)\s*(.+)$/
  ]
  
  for (const pattern of patterns) {
    const match = cleanText.match(pattern)
    if (match) {
      const [, quantityStr, unit, ingredient] = match
      let quantity: number | null = null
      
      if (quantityStr.includes('/')) {
        // Handle fractions
        const [num, den] = quantityStr.split('/').map(Number)
        quantity = num / den
      } else if (quantityStr.includes('-') || quantityStr.includes('–')) {
        // Handle ranges - use the first number
        const firstNum = quantityStr.split(/[-–]/)[0]
        quantity = parseFloat(firstNum.replace(',', '.'))
      } else {
        // Handle regular numbers
        quantity = parseFloat(quantityStr.replace(',', '.'))
      }
      
      return { quantity, unit: unit.trim(), ingredient: ingredient.trim() }
    }
  }
  
  // No quantity found
  return { quantity: null, unit: '', ingredient: cleanText }
}

// Format quantity back to string
const formatQuantity = (quantity: number, originalQuantityStr: string): string => {
  // Check if original was a fraction
  if (originalQuantityStr.includes('/')) {
    // Try to convert back to fraction if it makes sense
    const decimal = quantity % 1
    if (decimal === 0.5) return `${Math.floor(quantity)}.5`
    if (decimal === 0.25) return `${Math.floor(quantity)}.25`
    if (decimal === 0.75) return `${Math.floor(quantity)}.75`
    if (decimal === 0.33) return `${Math.floor(quantity)}.33`
    if (decimal === 0.67) return `${Math.floor(quantity)}.67`
  }
  
  // Check if original was a range
  if (originalQuantityStr.includes('-') || originalQuantityStr.includes('–')) {
    const separator = originalQuantityStr.includes('–') ? '–' : '-'
    const parts = originalQuantityStr.split(new RegExp(`[${separator}]`))
    if (parts.length === 2) {
      const originalFirst = parseFloat(parts[0].replace(',', '.'))
      const originalSecond = parseFloat(parts[1].replace(',', '.'))
      const ratio = originalSecond / originalFirst
      const newSecond = quantity * ratio
      
      // Format both numbers
      const firstFormatted = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1).replace('.', ',')
      const secondFormatted = newSecond % 1 === 0 ? newSecond.toString() : newSecond.toFixed(1).replace('.', ',')
      
      return `${firstFormatted}${separator}${secondFormatted}`
    }
  }
  
  // Regular number formatting
  if (quantity % 1 === 0) {
    return quantity.toString()
  } else {
    return quantity.toFixed(1).replace('.', ',')
  }
}

// Create and insert the multiplier control
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

// Apply multiplier to ingredients
const applyMultiplier = (ingredients: IngredientData[], multiplier: number): void => {
  ingredients.forEach(({ element, originalText, quantity, unit, ingredient }) => {
    if (quantity !== null) {
      const newQuantity = quantity * multiplier
      const originalQuantityMatch = originalText.match(/^[-\s]*(\d+[.,]?\d*|\d+\/\d+|\d+[-–]\d+)/)
      const originalQuantityStr = originalQuantityMatch ? originalQuantityMatch[1] : ''
      
      const formattedQuantity = formatQuantity(newQuantity, originalQuantityStr)
      
      // Reconstruct the text by replacing only the quantity part
      const quantityRegex = /^([-\s]*)(\d+[.,]?\d*|\d+\/\d+|\d+[-–]\d+)/
      const newText = originalText.replace(quantityRegex, `$1${formattedQuantity}`)
      
      // Check if this element has nested lists
      const hasNestedLists = element.querySelector('ul, ol')
      
      if (hasNestedLists) {
        // Update only the direct text nodes, preserving nested elements
        for (const node of element.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const nodeText = node.textContent || ''
            if (nodeText.trim() && originalText.includes(nodeText.trim())) {
              node.textContent = newText
              break
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const elementNode = node as Element
            if (!['UL', 'OL'].includes(elementNode.tagName)) {
              // Update non-list elements
              const nodeText = elementNode.textContent || ''
              if (nodeText.trim() && originalText.includes(nodeText.trim())) {
                elementNode.textContent = newText
                break
              }
            }
          }
        }
      } else {
        // No nested lists, safe to update textContent directly
        element.textContent = newText
      }
    }
  })
}

// Reset ingredients to original values
const resetIngredients = (ingredients: IngredientData[]): void => {
  ingredients.forEach(({ element, originalText }) => {
    // Check if this element has nested lists
    const hasNestedLists = element.querySelector('ul, ol')
    
    if (hasNestedLists) {
      // Update only the direct text nodes, preserving nested elements
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const nodeText = node.textContent || ''
          if (nodeText.trim()) {
            node.textContent = originalText
            break
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const elementNode = node as Element
          if (!['UL', 'OL'].includes(elementNode.tagName)) {
            // Update non-list elements
            const nodeText = elementNode.textContent || ''
            if (nodeText.trim()) {
              elementNode.textContent = originalText
              break
            }
          }
        }
      }
    } else {
      // No nested lists, safe to update textContent directly
      element.textContent = originalText
    }
    
    // Remove visual indicator
    element.classList.remove('ingredient-scaled')
  })
}

document.addEventListener("nav", () => {
  // Find the ingredients section
  const ingredientsHeader = document.querySelector('h1[id*="hozzávalók"], h1[id*="Hozzávalók"]') as HTMLElement
  if (!ingredientsHeader) return
  
  // Find the next h1 to determine the end of ingredients section
  let nextHeader = ingredientsHeader.nextElementSibling
  while (nextHeader && nextHeader.tagName !== 'H1') {
    nextHeader = nextHeader.nextElementSibling
  }
  
  // Collect all elements in the ingredients section (including spans and list items)
  const ingredientElements: IngredientData[] = []
  let currentElement = ingredientsHeader.nextElementSibling
  
  while (currentElement && currentElement !== nextHeader) {
    // Handle spans with data-qty-parse
    const spans = currentElement.querySelectorAll('span[data-qty-parse]')
    spans.forEach(span => {
      const originalText = span.textContent?.trim() || ''
      const parsed = parseQuantity(originalText)
      ingredientElements.push({
        element: span as HTMLElement,
        originalText,
        ...parsed
      })
    })
    
    // Handle list items - get all li elements including nested ones
    if (currentElement.tagName === 'UL' || currentElement.tagName === 'OL') {
      const allListItems = currentElement.querySelectorAll('li')
      
      allListItems.forEach(li => {
        // Get only the direct text content of this li, excluding nested lists
        let directText = ''
        for (const node of li.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            directText += node.textContent || ''
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            // Include text from non-list elements (like spans, strong, etc.)
            if (!['UL', 'OL'].includes(element.tagName)) {
              directText += element.textContent || ''
            }
          }
        }
        
        const originalText = directText.trim()
        if (originalText) {
          const parsed = parseQuantity(originalText)
          ingredientElements.push({
            element: li as HTMLElement,
            originalText,
            ...parsed
          })
        }
      })
    }
    
    // Also check if the current element itself is a span with data-qty-parse
    if (currentElement.tagName === 'SPAN' && currentElement.hasAttribute('data-qty-parse')) {
      const originalText = currentElement.textContent?.trim() || ''
      const parsed = parseQuantity(originalText)
      ingredientElements.push({
        element: currentElement as HTMLElement,
        originalText,
        ...parsed
      })
    }
    
    currentElement = currentElement.nextElementSibling
  }
  
  // Only add multiplier if we found ingredients with quantities
  const hasQuantities = ingredientElements.some(ing => ing.quantity !== null)
  if (!hasQuantities) return
  
  // Remove existing multiplier if present
  const existingMultiplier = document.querySelector('.ingredient-multiplier')
  if (existingMultiplier) {
    existingMultiplier.remove()
  }
  
  // Create and insert the multiplier control
  const multiplierControl = createMultiplierControl()
  ingredientsHeader.parentNode?.insertBefore(multiplierControl, ingredientsHeader.nextSibling)
  
  // Get references to controls
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
  
  // Event handlers
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
  }
  
  // Add event listeners
  input.addEventListener('input', updateMultiplier)
  input.addEventListener('change', updateMultiplier)
  decreaseBtn.addEventListener('click', handleDecrease)
  increaseBtn.addEventListener('click', handleIncrease)
  resetBtn.addEventListener('click', handleReset)
  
  // Cleanup function
  window.addCleanup(() => {
    input.removeEventListener('input', updateMultiplier)
    input.removeEventListener('change', updateMultiplier)
    decreaseBtn.removeEventListener('click', handleDecrease)
    increaseBtn.removeEventListener('click', handleIncrease)
    resetBtn.removeEventListener('click', handleReset)
  })
})
