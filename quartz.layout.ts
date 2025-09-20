import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer(),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs({ rootName: "Kezdőlap" }),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta({ showReadingTime: false, showComma: false}),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode(), },
        { Component: Component.ReaderMode(), },
      ],
    }),
    Component.Explorer(),
  ],
  right: [
    // Component.Graph(),
    // Component.DesktopOnly(Component.TableOfContents()),
    // Component.Backlinks(),
    Component.DesktopOnly(Component.RecentNotes({ title: "Legújabbak", limit: 5, showTags: false }))
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs({ rootName: "Kezdőlap" }), Component.ArticleTitle(), Component.ContentMeta( { showReadingTime: false, showComma: false})],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(),
    Component.DesktopOnly(Component.RecentNotes({ title: "Legújabbak", limit: 5, showTags: false }))
  ],
  right: [],
}
