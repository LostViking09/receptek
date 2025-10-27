import { FullSlug, isFolderPath, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date, getDate } from "./Date"
import { QuartzComponent, QuartzComponentProps } from "./types"
import { GlobalConfiguration } from "../cfg"
import { Root } from "hast"
import { visit } from "unist-util-visit"

export type SortFn = (f1: QuartzPluginData, f2: QuartzPluginData) => number

export function byDateAndAlphabetical(cfg: GlobalConfiguration): SortFn {
  return (f1, f2) => {
    // Sort by date/alphabetical
    if (f1.dates && f2.dates) {
      // sort descending
      return getDate(cfg, f2)!.getTime() - getDate(cfg, f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      // prioritize files with dates
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }

    // otherwise, sort lexographically by title
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

export function byDateAndAlphabeticalFolderFirst(cfg: GlobalConfiguration): SortFn {
  return (f1, f2) => {
    // Sort folders first
    const f1IsFolder = isFolderPath(f1.slug ?? "")
    const f2IsFolder = isFolderPath(f2.slug ?? "")
    if (f1IsFolder && !f2IsFolder) return -1
    if (!f1IsFolder && f2IsFolder) return 1

    // If both are folders or both are files, sort by date/alphabetical
    if (f1.dates && f2.dates) {
      // sort descending
      return getDate(cfg, f2)!.getTime() - getDate(cfg, f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      // prioritize files with dates
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }

    // otherwise, sort lexographically by title
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

type Props = {
  limit?: number
  sort?: SortFn
} & QuartzComponentProps

// Helper function to extract the first image from page content
function extractFirstImage(page: QuartzPluginData): string | null {
  if (!page.htmlAst) return null
  
  let firstImage: string | null = null
  visit(page.htmlAst as Root, "element", (node: any) => {
    if (node.tagName === "img" && !firstImage) {
      firstImage = node.properties?.src || null
    }
  })
  
  return firstImage
}

export const PageList: QuartzComponent = ({ cfg, fileData, allFiles, limit, sort }: Props) => {
  const sorter = sort ?? byDateAndAlphabeticalFolderFirst(cfg)
  let list = allFiles.sort(sorter)
  if (limit) {
    list = list.slice(0, limit)
  }

  return (
    <div class="recipe-grid">
      {list.map((page) => {
        const title = page.frontmatter?.title
        const tags = page.frontmatter?.tags ?? []
        const imageSrc = extractFirstImage(page)
        // Check if imageSrc is already an absolute URL
        const imageUrl = imageSrc 
          ? (imageSrc.startsWith('http://') || imageSrc.startsWith('https://'))
            ? imageSrc  // Use absolute URL as-is
            : resolveRelative(fileData.slug!, imageSrc as FullSlug)  // Resolve relative path
          : null

        return (
          <a href={resolveRelative(fileData.slug!, page.slug!)} class="recipe-card">
            <div class="recipe-card-image">
              {imageUrl ? (
                <img src={imageUrl} alt={title || "Recipe"} loading="lazy" />
              ) : (
                <div class="recipe-card-placeholder"></div>
              )}
            </div>
            <div class="recipe-card-content">
              <h3 class="recipe-card-title">{title}</h3>
              {/* Dates hidden for now - uncomment to show dates */}
              {/* {page.dates && (
                <p class="recipe-card-date">
                  <Date date={getDate(cfg, page)!} locale={cfg.locale} />
                </p>
              )} */}
              {tags.length > 0 && (
                <ul class="recipe-card-tags">
                  {tags.map((tag) => (
                    <li>
                      <span class="tag-badge">{tag}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </a>
        )
      })}
    </div>
  )
}

PageList.css = `
.section h3 {
  margin: 0;
}

.section > .tags {
  margin: 0;
}
`
