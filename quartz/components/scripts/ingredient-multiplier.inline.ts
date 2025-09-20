import { getFullSlug } from "../../util/path"

interface IngredientData {
  element: HTMLElement
  originalText: string
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
      
      // Check if this position is already covered by a previous match
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
  
  // Sort by position to process from end to start (to avoid index shifting)
  return quantities.sort((a, b) => b.start - a.start)
}

// Check if text contains any quantities
const hasQuantitiesInText = (text: string): boolean => {
  return findAllQuantities(text).length > 0
}

// Apply multiplier to all quantities in a text string
const scaleQuantitiesInText = (text: string, multiplier: number): string => {
  const quantities = findAllQuantities(text)
  let result = text
  
  // Process from end to start to avoid index shifting
  for (const { match, quantity, start, end } of quantities) {
    const scaledQuantity = quantity * multiplier
    const formattedQuantity = formatQuantity(scaledQuantity, match)
    result = result.substring(0, start) + formattedQuantity + result.substring(end)
  }
  
  return result
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
  ingredients.forEach(({ element, originalText, hasQuantities }) => {
    if (hasQuantities) {
      const newText = scaleQuantitiesInText(originalText, multiplier)
      
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
  const multiplierKey = `${getFullSlug(window)}-ingredient-multiplier`
  
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
      const hasQuantities = hasQuantitiesInText(originalText)
      ingredientElements.push({
        element: span as HTMLElement,
        originalText,
        hasQuantities
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
          const hasQuantities = hasQuantitiesInText(originalText)
          ingredientElements.push({
            element: li as HTMLElement,
            originalText,
            hasQuantities
          })
        }
      })
    }
    
    // Also check if the current element itself is a span with data-qty-parse
    if (currentElement.tagName === 'SPAN' && currentElement.hasAttribute('data-qty-parse')) {
      const originalText = currentElement.textContent?.trim() || ''
      const hasQuantities = hasQuantitiesInText(originalText)
      ingredientElements.push({
        element: currentElement as HTMLElement,
        originalText,
        hasQuantities
      })
    }
    
    currentElement = currentElement.nextElementSibling
  }
  
  // Only add multiplier if we found ingredients with quantities
  const hasAnyQuantities = ingredientElements.some(ing => ing.hasQuantities)
  if (!hasAnyQuantities) return
  
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
  window.addCleanup?.(() => {
    input.removeEventListener('input', updateMultiplier)
    input.removeEventListener('change', updateMultiplier)
    decreaseBtn.removeEventListener('click', handleDecrease)
    increaseBtn.removeEventListener('click', handleIncrease)
    resetBtn.removeEventListener('click', handleReset)
  })
})
