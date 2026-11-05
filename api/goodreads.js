// ============================================================
// Goodreads → JSON, for the Reading page.
//
// Vercel runs this file on its servers at  /api/goodreads
//
// Goodreads shut down its shelf RSS feeds in October 2026, so this
// reads Goodreads' public "bookshelf widget" instead (the thing
// Goodreads offers for embedding on blogs) and turns it into a list.
// The widget doesn't include the date you finished a book, but it is
// sorted by it.
//
// Settings you might change:
// ============================================================

const GOODREADS_USER_ID = process.env.GOODREADS_USER_ID || "160897919";
const SHELF = "read";
const NUM_BOOKS = 5; // how many books to show

// ------------------------------------------------------------

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function text(html) {
  return decodeEntities(String(html || "").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

// The widget is JavaScript that writes HTML; undo the JS string escaping.
function unescapeJS(s) {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\(["'\/\\])/g, "$1");
}

function fullSizeCover(src) {
  if (!src || /nophoto|no_cover|nocover/i.test(src)) return "";
  return src.replace(/\._[A-Z]{2}\d+_(?=\.)/, ""); // drop Goodreads' "._SX98_" size suffix
}

function parseWidget(raw) {
  const html = unescapeJS(raw);
  const blocks = html.split(/<div[^>]+class=["'][^"']*gr_custom_each_container[^"']*["'][^>]*>/i).slice(1);
  return blocks.map((b) => {
    const titleDiv = b.match(/class=["'][^"']*gr_custom_title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const authorDiv = b.match(/class=["'][^"']*gr_custom_author[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const img = b.match(/<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
    const imgAlt = b.match(/<img[^>]*\salt=["']([^"']*)["']/i);
    const href = (titleDiv && titleDiv[1].match(/href=["']([^"']+)["']/i)) || b.match(/href=["']([^"']+)["']/i);
    let author = authorDiv ? text(authorDiv[1]).replace(/^by\s+/i, "") : "";
    return {
      title: titleDiv ? text(titleDiv[1]) : text(imgAlt && imgAlt[1]),
      author,
      cover: fullSizeCover(img && img[1]),
      link: href ? decodeEntities(href[1]).replace(/^\/\//, "https://").replace(/^\//, "https://www.goodreads.com/") : "",
    };
  }).filter((b) => b.title);
}

module.exports = async function handler(req, res) {
  const params = new URLSearchParams({
    shelf: SHELF,
    sort: "date_read",
    order: "d",
    num_books: String(NUM_BOOKS),
    show_author: "1",
    show_cover: "1",
    show_title: "1",
    show_rating: "0",
    show_review: "0",
    show_tags: "0",
    cover_size: "large",
    cover_position: "left",
    widget_id: "alecsliu",
  });
  const url = `https://www.goodreads.com/review/custom_widget/${GOODREADS_USER_ID}.Read?${params}`;

  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; alecsliu.com reading page)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`Goodreads responded with status ${r.status}`);
    const raw = await r.text();
    const books = parseWidget(raw).slice(0, NUM_BOOKS);
    if (!books.length) throw new Error("Couldn't find any books in the Goodreads widget. Start of response: " + raw.slice(0, 300));

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ configured: true, books });
  } catch (err) {
    res.status(502).json({ configured: true, error: String(err.message || err), books: [] });
  }
};
