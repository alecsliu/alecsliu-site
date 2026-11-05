# alecsliu.com

A plain HTML site, hosted on Vercel. There's no build step: every `.html` file is a page.

## How the files are laid out

```
index.html          ← home page
style.css           ← colors, fonts, spacing for the whole site
images/             ← put photos here
templates/page.html ← copy this to make a new page
travel/index.html   ← the Travel section page (lists its sub-pages)
travel/*.html       ← individual travel pages
reading/  languages/  creative/   ← same idea
```

## Adding a new page

1. Copy `templates/page.html` into a section folder and rename it,
   e.g. `travel/lisbon-2026.html`. Use lowercase with dashes and no spaces.
2. Open it and follow the notes at the top: change the title, the breadcrumb and the content.
3. Open that section's `index.html` and copy one `<li>…</li>` block to link to the new page.
   (Delete the "Nothing here yet" line the first time.)
4. Upload the changed files to GitHub. Vercel updates the site in about a minute.

The page will be live at `alecsliu.com/travel/lisbon-2026`.

## Formatting cheat sheet

| You want      | Write this                                  |
|---------------|---------------------------------------------|
| Paragraph     | `<p>Text here.</p>`                         |
| **Bold**      | `<strong>words</strong>`                    |
| *Italic*      | `<em>words</em>`                            |
| Link          | `<a href="https://…">words</a>`             |
| Small heading | `<h3>Heading</h3>`                          |
| Photo         | `<img src="../images/photo.jpg" alt="…">`   |
| Bullet list   | `<ul><li>One</li><li>Two</li></ul>`         |
| Quote         | `<blockquote>Quote</blockquote>`            |

## Photos

- Put the file in `images/`, e.g. `images/lisbon-tram.jpg`.
- On a page inside a section folder, refer to it as `../images/lisbon-tram.jpg`.
  On the home page, use `images/lisbon-tram.jpg` (no `../`).
- Shrink photos before uploading (about 2000px wide, under 500 KB). Phone photos are
  often 5 MB or more, which makes pages slow. squoosh.app does this for free in your browser.

## Changing the look

Colors are at the top of `style.css`, each with a comment saying what it controls.
