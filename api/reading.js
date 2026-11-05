// ============================================================
// Reading list → JSON, for the Reading page.  (/api/reading)
//
// Main source: Hardcover (hardcover.app/@alecsliu), via its API.
// The API key lives in Vercel → Settings → Environment Variables
// as HARDCOVER_TOKEN, never in this file.
// If Hardcover isn't set up or fails, it falls back to the Goodreads widget.
// ============================================================

const { fetchGoodreads } = require("./_goodreads.js");

const NUM_BOOKS = 10; // how many books to show
const USERNAME = "alecsliu"; // hardcover.app/@alecsliu
const API = "https://api.hardcover.app/v1/graphql";

const BOOK_FIELDS = `book { title slug image { url } contributions { author { name } } }`;

// Preferred: Hardcover sorts by the date you last finished each book.
const QUERY_SORTED = `query ($n: Int!) {
  me {
    user_books(where: { status_id: { _eq: 3 } }, order_by: [{ last_read_date: desc_nulls_last }, { id: desc }], limit: $n) {
      last_read_date
      user_book_reads { finished_at }
      ${BOOK_FIELDS}
    }
  }
}`;

// Same, looked up by username (works with a public-library-only key).
const QUERY_BY_USER = `query ($n: Int!, $u: citext!) {
  user_books(where: { status_id: { _eq: 3 }, user: { username: { _eq: $u } } }, order_by: [{ last_read_date: desc_nulls_last }, { id: desc }], limit: $n) {
    last_read_date
    user_book_reads { finished_at }
    ${BOOK_FIELDS}
  }
}`;

// Fallback: fetch recent "read" books and sort by finish date here.
const QUERY_RECENT = `query {
  me {
    user_books(where: { status_id: { _eq: 3 } }, order_by: { id: desc }, limit: 100) {
      user_book_reads { finished_at }
      ${BOOK_FIELDS}
    }
  }
}`;

async function hardcover(query, variables) {
  let token = (process.env.HARDCOVER_TOKEN || "").trim();
  if (!token) throw new Error("HARDCOVER_TOKEN is not set in Vercel");
  if (!/^bearer /i.test(token)) token = "Bearer " + token;
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "User-Agent": "alecsliu.com reading page" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(8000),
  });
  const text = await r.text();
  let data = {};
  try { data = JSON.parse(text); } catch (e) {}
  if (!r.ok || data.errors) {
    const msg = (data.errors && data.errors.map((e) => e.message).join("; ")) || `status ${r.status}: ${text.slice(0, 200)}`;
    throw new Error("Hardcover: " + msg);
  }
  if (data.data.user_books) return data.data.user_books;
  const me = Array.isArray(data.data.me) ? data.data.me[0] : data.data.me;
  if (!me) throw new Error("Hardcover: no user for this API key");
  return me.user_books || [];
}

function toBook(ub) {
  const reads = (ub.user_book_reads || []).map((r) => r.finished_at).filter(Boolean).sort();
  const finished = ub.last_read_date || reads[reads.length - 1] || null;
  const b = ub.book || {};
  const authors = (b.contributions || []).map((c) => c.author && c.author.name).filter(Boolean);
  return {
    title: b.title || "",
    author: [...new Set(authors)].slice(0, 2).join(", "),
    cover: (b.image && b.image.url) || "",
    link: b.slug ? `https://hardcover.app/books/${b.slug}` : "",
    finished, // "YYYY-MM-DD" or null
  };
}

async function fetchHardcover() {
  const attempts = [
    () => hardcover(QUERY_SORTED, { n: NUM_BOOKS }),
    () => hardcover(QUERY_BY_USER, { n: NUM_BOOKS, u: USERNAME }),
    () => hardcover(QUERY_RECENT, {}), // older schema without last_read_date
  ];
  let rows = null, errors = [];
  for (const attempt of attempts) {
    try { rows = await attempt(); break; }
    catch (e) {
      if (/HARDCOVER_TOKEN/.test(e.message)) throw e;
      errors.push(e.message);
    }
  }
  if (!rows) throw new Error(errors.join(" || "));
  return rows
    .map(toBook)
    .filter((b) => b.title)
    .sort((a, b) => (b.finished || "").localeCompare(a.finished || ""))
    .slice(0, NUM_BOOKS);
}

module.exports = async function handler(req, res) {
  let books = [], source = "hardcover", note = null;
  try {
    books = await fetchHardcover();
    if (!books.length) throw new Error("Hardcover returned no read books");
  } catch (e) {
    note = String(e.message || e);
    source = "goodreads";
    try {
      books = (await fetchGoodreads()).slice(0, NUM_BOOKS).map((b) => ({ ...b, finished: null }));
    } catch (e2) {
      res.status(502).json({ error: note + " | Goodreads: " + (e2.message || e2), books: [] });
      return;
    }
  }
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({ source, note, books });
};
