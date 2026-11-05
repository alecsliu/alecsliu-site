// ============================================================
// Goodreads → JSON, for the Reading page.
//
// Vercel runs this file on its servers at  /api/goodreads
// It reads your public Goodreads "read" shelf (an RSS feed),
// and hands the Reading page a tidy list of books.
//
// The only thing you'd ever change is the ID below.
// Find it in your Goodreads profile URL:
//   goodreads.com/user/show/12345678-alec  →  "12345678"
// ============================================================

const GOODREADS_USER_ID = process.env.GOODREADS_USER_ID || "160897919";
const SHELF = "read";
const MAX_PAGES = 10; // the feed gives ~100 books per page

function pick(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!m) return "";
  return m[1]
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function toISO(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString();
}

module.exports = async function handler(req, res) {
  if (!/^\d+$/.test(GOODREADS_USER_ID)) {
    res.status(200).json({ configured: false, books: [] });
    return;
  }

  const seen = new Set();
  const books = [];

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `https://www.goodreads.com/review/list_rss/${GOODREADS_USER_ID}?shelf=${SHELF}&page=${page}`;
      const r = await fetch(url, { headers: { "User-Agent": "alecsliu.com reading page" } });
      if (!r.ok) {
        if (page === 1) throw new Error(`Goodreads responded ${r.status}`);
        break;
      }
      const xml = await r.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      let added = 0;
      for (const item of items) {
        const id = pick(item, "book_id") || pick(item, "guid");
        if (seen.has(id)) continue;
        seen.add(id);
        added++;
        books.push({
          title: pick(item, "title"),
          author: pick(item, "author_name"),
          finished: toISO(pick(item, "user_read_at")),
          added: toISO(pick(item, "user_date_added")),
          rating: Number(pick(item, "user_rating")) || 0,
          cover: pick(item, "book_large_image_url") || pick(item, "book_image_url"),
          link: id ? `https://www.goodreads.com/book/show/${id}` : pick(item, "link"),
        });
      }
      if (added === 0) break; // no new books → reached the end
    }

    // Newest finished first; books without a finish date go last.
    books.sort((a, b) => (b.finished || "").localeCompare(a.finished || ""));

    // Cache on Vercel for an hour so Goodreads isn't hit on every visit.
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ configured: true, books });
  } catch (err) {
    res.status(502).json({ configured: true, error: String(err.message || err), books: [] });
  }
};
