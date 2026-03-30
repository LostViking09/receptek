import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Root } from "hast"
import { visit } from "unist-util-visit"
import { trieFromAllFiles, BuildTimeTrieData } from "../util/ctx"
import { FileTrieNode } from "../util/fileTrie"
import style from "./styles/listPage.scss"

// @ts-ignore
import script from "./scripts/folderGrid.inline"

function getAllImagesFromNode(node: FileTrieNode<BuildTimeTrieData>, fileData: QuartzPluginData): {url: string, title: string}[] {
  const images: {url: string, title: string}[] = []
  
  const recipeTitle = node.data?.title || node.displayName || ""
  
  if (node.data && (node.data as any).htmlAst) {
    visit((node.data as any).htmlAst as Root, "element", (el: any) => {
      if (el.tagName === "img") {
        const src = el.properties?.src
        if (src) {
           const isAbsoluteUrl = /^(https?:\/\/|www\.)/i.test(src)
           const imageUrl = isAbsoluteUrl 
            ? src 
            : resolveRelative(fileData.slug!, src as FullSlug)
          
          // Use .thumb.jpg for efficiency
          const thumbUrl = imageUrl && !isAbsoluteUrl
            ? imageUrl.replace(/\.(png|jpe?g|webp)$/i, '.thumb.jpg')
            : imageUrl
            
          images.push({ url: thumbUrl, title: recipeTitle })
        }
      }
    })
  }
  
  for (const child of node.children as FileTrieNode<BuildTimeTrieData>[]) {
    images.push(...getAllImagesFromNode(child, fileData))
  }
  
  return images
}

export const FolderGrid: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
  const trie = trieFromAllFiles(allFiles)
  const mainFolders = trie.children.filter(child => 
    child.isFolder && 
    child.slugSegment !== "attachments" && 
    child.slugSegment !== ".obsidian"
  )

  // Sort folders alphabetically
  mainFolders.sort((a, b) => a.displayName.localeCompare(b.displayName))

  return (
    <div class={`recipe-grid folder-grid ${displayClass ?? ""}`}>
      {mainFolders.map((folder) => {
        const title = folder.displayName
        const rawImages = getAllImagesFromNode(folder as FileTrieNode<BuildTimeTrieData>, fileData)
        const uniqueImagesMap = new Map<string, {url: string, title: string}>()
        for (const img of rawImages) {
          if (!uniqueImagesMap.has(img.url)) {
            uniqueImagesMap.set(img.url, img)
          }
        }
        const images = Array.from(uniqueImagesMap.values())
        
        // Final destination is the folder path without "index"
        const folderUrl = resolveRelative(fileData.slug!, folder.slug)

        return (
          <a href={folderUrl} class="recipe-card folder-card" data-images={JSON.stringify(images)}>
            <div class="recipe-card-image">
              <img 
                src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
                alt={title} 
                loading="lazy" 
                class="folder-image"
              />
              <span class="image-attribution"></span>
            </div>
            <div class="recipe-card-content">
              <h3 class="recipe-card-title">{title}</h3>
            </div>
          </a>
        )
      })}
    </div>
  )
}

FolderGrid.css = style + `
.recipe-card-image {
  position: relative;
}
.image-attribution {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.2);
  padding: 1px 2px;
  border-radius: 4px;
  pointer-events: none;
  text-shadow: 0 0px 2px rgba(0, 0, 0, 1);
}
`
FolderGrid.afterDOMLoaded = script

export default (() => FolderGrid) satisfies QuartzComponentConstructor
