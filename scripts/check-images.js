import { MAKERS } from "../src/data/makers.js"

const urls = new Set()
MAKERS.forEach(m => {
  if (m.avatar_url) urls.add(m.avatar_url)
  ;(m.gallery_urls || []).forEach(u => urls.add(u))
})

console.log("Total unique URLs:", urls.size)

const broken = []
for (const url of urls) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" })
    if (!res.ok) broken.push(`${res.status} ${url}`)
  } catch (e) {
    broken.push(`ERR ${url} (${e.message})`)
  }
}

if (broken.length === 0) {
  console.log("All URLs OK!")
} else {
  console.log(`\nBroken: ${broken.length}`)
  broken.forEach(b => console.log(b))
}
