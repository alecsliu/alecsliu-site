# alecsliu.com

A plain HTML site, hosted on Vercel. There's no build step: every `.html` file is a page.

## How the files are laid out

```
index.html                 ← home page
style.css                  ← colors, fonts, spacing for the whole site
favicon.svg                ← the little icon in the browser tab
images/                    ← put photos here
reading/index.html         ← Reading: books pulled from Goodreads automatically
library/index.html         ← Personal library: your blurb + LibraryThing catalogue
le-petit-prince/index.html ← Le Petit Prince: covers from a LibraryThing collection
travel/index.html          ← Travel: list of places
travel/*.html              ← one page per place
templates/place.html       ← travel: a city guide (bookstores, cafés…)
templates/list.html        ← travel: a themed list, e.g. "Hikes of 2026"
templates/trip.html        ← travel: a day-by-day trip journal
templates/page.html        ← copy this for any other kind of page
api/goodreads.js           ← fetches your Goodreads shelf (Goodreads user ID goes here)
js/librarything.js         ← loads your LibraryThing catalogue (username goes here)
```

## Writing your own text on the book pages

Look for the comments marked `YOUR BLURB` or `YOUR TEXT` in
`library/index.html` and `le-petit-prince/index.html`, and replace the bracketed text.

## Adding a new page

1. For a travel place, copy `templates/place.html` into `travel/` and rename it,
   e.g. `travel/lisbon.html`. Use lowercase with dashes and no spaces.
2. Open it and follow the notes at the top: change the title, the breadcrumb and the content.
3. Open that section's `index.html` and copy one `<li>…</li>` block to link to the new page.
   (Delete the "Nothing here yet" line the first time.)
4. Upload the changed files to GitHub. Vercel updates the site in about a minute.

The page will be live at `alecsliu.com/travel/lisbon`.

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
