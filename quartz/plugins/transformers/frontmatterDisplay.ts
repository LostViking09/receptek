import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"
import { Root, Element, Text } from "hast"

export interface Options {
  /**
   * Whether to show the frontmatter display section
   * @default true
   */
  enable?: boolean
  /**
   * Title for the frontmatter section
   * @default "Properties"
   */
  title?: string
  /**
   * Properties to exclude from display
   * @default ["title", "draft", "publish"]
   */
  excludeProperties?: string[]
  /**
   * CSS class for the frontmatter container
   * @default "frontmatter-display"
   */
  cssClass?: string
}

const defaultOptions: Options = {
  enable: true,
  title: "Információ",
  excludeProperties: ["title", "draft", "publish", "share_link", "share_updated"],
  cssClass: "frontmatter-display",
}

function formatPropertyValue(value: any): (Element | Text)[] {
  if (Array.isArray(value)) {
    const elements: (Element | Text)[] = []
    value.forEach((item, index) => {
      if (index > 0) {
        elements.push({ type: "text", value: ", " } as Text)
      }
      elements.push(...createValueElements(String(item)))
    })
    return elements
  }
  if (typeof value === "object" && value !== null) {
    return [{ type: "text", value: JSON.stringify(value, null, 2) } as Text]
  }
  return createValueElements(String(value))
}

function createValueElements(text: string): (Element | Text)[] {
  // URL regex pattern to match http/https URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  const elements: (Element | Text)[] = []
  
  parts.forEach((part, index) => {
    if (urlRegex.test(part)) {
      // This is a URL, create a link element
      elements.push({
        type: "element",
        tagName: "a",
        properties: {
          href: part,
          target: "_blank",
          rel: "noopener noreferrer",
          className: ["frontmatter-link"]
        },
        children: [{ type: "text", value: part } as Text]
      })
    } else if (part) {
      // This is regular text
      elements.push({ type: "text", value: part } as Text)
    }
  })
  
  return elements
}

function formatPropertyKey(key: string): string {
  // Convert camelCase to Title Case and handle special characters
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
}

function createFrontmatterElement(frontmatter: Record<string, any>, options: Options): Element {
  const { title, excludeProperties, cssClass } = options
  
  // Filter out excluded properties and empty values
  const displayProperties = Object.entries(frontmatter).filter(
    ([key, value]) => 
      !excludeProperties!.includes(key) && 
      value !== undefined && 
      value !== null && 
      value !== ""
  )

  if (displayProperties.length === 0) {
    return {
      type: "element",
      tagName: "div",
      properties: {},
      children: []
    }
  }

  const propertyElements: Element[] = displayProperties.map(([key, value]) => ({
    type: "element",
    tagName: "div",
    properties: { className: ["frontmatter-property"] },
    children: [
      {
        type: "element",
        tagName: "span",
        properties: { className: ["frontmatter-key"] },
        children: [{ type: "text", value: formatPropertyKey(key) } as Text]
      },
      {
        type: "element",
        tagName: "span",
        properties: { className: ["frontmatter-value"] },
        children: formatPropertyValue(value)
      }
    ]
  }))

  return {
    type: "element",
    tagName: "div",
    properties: { 
      className: [cssClass!],
      "data-frontmatter": "true"
    },
    children: [
      {
        type: "element",
        tagName: "h3",
        properties: { className: ["frontmatter-title"] },
        children: [{ type: "text", value: title! } as Text]
      },
      {
        type: "element",
        tagName: "div",
        properties: { className: ["frontmatter-content"] },
        children: propertyElements
      }
    ]
  }
}

export const FrontmatterDisplay: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  
  return {
    name: "FrontmatterDisplay",
    htmlPlugins() {
      return [
        () => {
          return (tree: Root, file) => {
            if (!opts.enable) return

            const frontmatter = file.data?.frontmatter
            if (!frontmatter || typeof frontmatter !== "object") return

            // Create frontmatter element
            const frontmatterElement = createFrontmatterElement(frontmatter, opts)
            
            // Only proceed if there are properties to display
            if (frontmatterElement.children.length === 0) {
              return
            }

            // Insert frontmatter display at the beginning of the document
            if (tree.children && tree.children.length > 0) {
              tree.children.unshift(frontmatterElement)
            }
          }
        }
      ]
    },
    externalResources() {
      return {
        css: [
          {
            content: "./static/frontmatter-display.css"
          }
        ]
      }
    }
  }
}
