document.addEventListener("nav", () => {
  const folderCards = document.querySelectorAll(".folder-card") as NodeListOf<HTMLAnchorElement>

  folderCards.forEach((card) => {
    const imagesData = card.getAttribute("data-images")
    if (!imagesData) return

    try {
      const images: {url: string, title: string}[] = JSON.parse(imagesData)
      if (images.length === 0) return

      // Pick a random image
      const randomIndex = Math.floor(Math.random() * images.length)
      const selectedImage = images[randomIndex]

      // Find the img tag and set its src
      const img = card.querySelector(".folder-image") as HTMLImageElement
      if (img) {
        img.src = selectedImage.url
      }
      
      const attr = card.querySelector(".image-attribution") as HTMLSpanElement
      if (attr && selectedImage.title) {
        attr.innerText = selectedImage.title
      }
    } catch (e) {
      console.error("Failed to parse folder images data", e)
    }
  })

  // Relocation logic
  const placeholder = document.getElementById("folder-grid-placeholder")
  const grid = document.querySelector(".folder-grid")
  if (placeholder && grid) {
    placeholder.appendChild(grid)
  }
})
