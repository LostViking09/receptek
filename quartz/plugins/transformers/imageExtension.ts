import { QuartzTransformerPlugin } from "../types"
import { Root } from "hast"
import { visit } from "unist-util-visit"
import isAbsoluteUrl from "is-absolute-url"

export const ImageExtension: QuartzTransformerPlugin = () => {
  return {
    name: "ImageExtension",
    htmlPlugins() {
      return [
        () => {
          return (tree: Root) => {
            visit(tree, "element", (node: any) => {
              if (
                (node.tagName === "img" && node.properties && typeof node.properties.src === "string") ||
                (node.tagName === "a" && node.properties && typeof node.properties.href === "string")
              ) {
                const isImg = node.tagName === "img"
                const propertyName = isImg ? "src" : "href"
                const target = node.properties[propertyName]
                
                // Biztonsági szűrők:
                // 1. Ne nyúljon külső URL-ekhez
                // 2. Ne nyúljon data-URI-hoz
                // 3. Ne nyúljon a rendszerfájlokhoz (pl. favicon)
                if (
                  isAbsoluteUrl(target) || 
                  target.startsWith("data:") || 
                  target.toLowerCase().includes("favicon")
                ) {
                  return
                }

                // Kiterjesztés csere: .png, .webp, .jpeg -> .jpg
                node.properties[propertyName] = target.replace(/\.(png|webp|jpeg)$/i, ".jpg")
              }
            })
          }
        },
      ]
    },
  }
}
