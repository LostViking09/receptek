import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import { Logo } from "./Logo"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <h2 class={classNames(displayClass, "page-title")}>
      <a href={baseDir}>
        <Logo class="logo" />
      </a>
    </h2>
  )
}

PageTitle.css = `
.page-title {
  font-size: 1.3rem;
  margin-block: 0 !important;
  font-family: var(--titleFont);
  display: flex;
  align-items: center;
}
.page-title a {
  display: flex;
  align-items: center;
  width: 100%;
  margin-block: 0 !important;
}
.page-title .logo {
  width: 100%;
  height: auto;
  display: block;
}
@media all and (max-width: 600px) {
  .page-title .logo {
    max-height: 5rem;
  }
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
