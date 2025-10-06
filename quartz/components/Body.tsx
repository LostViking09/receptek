// @ts-ignore
import clipboardScript from "./scripts/clipboard.inline"
// @ts-ignore
import orderedListScript from "./scripts/orderedlist.inline"
// @ts-ignore
import ingredientsScript from "./scripts/ingredients.inline"
import clipboardStyle from "./styles/clipboard.scss"
import ingredientMultiplierStyle from "./styles/ingredient-multiplier.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Body: QuartzComponent = ({ children }: QuartzComponentProps) => {
  return <div id="quartz-body">{children}</div>
}

Body.afterDOMLoaded = `${clipboardScript};${orderedListScript};${ingredientsScript}`
Body.css = `${clipboardStyle}${ingredientMultiplierStyle}`

export default (() => Body) satisfies QuartzComponentConstructor
