// ============================================================
// Reading list → JSON, for the Reading page.  (/api/reading)
//
// Main source: Hardcover (hardcover.app/@alecsliu), via its API.
// Returns the books you're currently reading and your most recently
// finished books, using the edition you read (title + cover + language).
// The API key lives in Vercel → Settings → Environment Variables
// as HARDCOVER_TOKEN, never in this file.
// If Hardcover isn't set up or fails, it falls back to the Goodreads widget.
// ============================================================

const { fetchGoodreads } = require("./_goodreads.js");

const NUM_BOOKS = 10;      // how many finished books to show
const USERNAME = "alecsliu"; // hardcover.app/@alecsliu
const API = "https://api.hardcover.app/v1/graphql";

// Hardcover's API has changed over time, so the query is built in a few
// variants, from most detailed to most basic; the first that works is used.
function fields({ roles, edition }) {
  const contribs = `contributions { author { name }${roles ? " contribution" : ""} }`;
  return `
    last_read_date
    user_book_reads { finished_at }
    ${edition ? `edition { title image { url } }` : ""}
    book { title slug image { url } ${contribs} }`;
}
function query(opts) {
  const f = fields(opts);
  return `query ($n: Int!, $u: citext!) {
    read: user_books(where: { status_id: { _eq: 3 }, user: { username: { _eq: $u } } },
                     order_by: [{ last_read_date: desc_nulls_last }, { id: desc }], limit: $n) { ${f} }
    reading: user_books(where: { status_id: { _eq: 2 }, user: { username: { _eq: $u } } },
                        order_by: { id: desc }, limit: 5) { ${f} }
  }`;
}
const VARIANTS = [
  { roles: true, edition: true },
  { roles: false, edition: true },
  { roles: false, edition: false },
];

async function hardcover(q, variables) {
  let token = (process.env.HARDCOVER_TOKEN || "").trim();
  if (!token) throw new Error("HARDCOVER_TOKEN is not set in Vercel");
  if (!/^bearer /i.test(token)) token = "Bearer " + token;
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "User-Agent": "alecsliu.com reading page" },
    body: JSON.stringify({ query: q, variables }),
    signal: AbortSignal.timeout(8000),
  });
  const text = await r.text();
  let data = {};
  try { data = JSON.parse(text); } catch (e) {}
  if (!r.ok || data.errors) {
    const msg = (data.errors && data.errors.map((e) => e.message).join("; ")) || `status ${r.status}: ${text.slice(0, 200)}`;
    throw new Error("Hardcover: " + msg);
  }
  return data.data || {};
}

function toBook(ub) {
  const reads = (ub.user_book_reads || []).map((r) => r.finished_at).filter(Boolean).sort();
  const finished = ub.last_read_date || reads[reads.length - 1] || null;
  const b = ub.book || {}, ed = ub.edition || {};
  // Authors only (skip translators, illustrators, etc. when Hardcover says so)
  const contribs = b.contributions || [];
  const authorsOnly = contribs.filter((c) => !c.contribution || /^author$/i.test(c.contribution));
  const names = (authorsOnly.length ? authorsOnly : contribs).map((c) => c.author && c.author.name).filter(Boolean);
  return {
    title: ed.title || b.title || "",
    author: [...new Set(names)].slice(0, 2).join(", "),
    cover: (ed.image && ed.image.url) || (b.image && b.image.url) || "",
    link: b.slug ? `https://hardcover.app/books/${b.slug}` : "",
    finished, // "YYYY-MM-DD" or null
  };
}

async function fetchHardcover() {
  const errors = [];
  for (const v of VARIANTS) {
    try {
      const d = await hardcover(query(v), { n: NUM_BOOKS, u: USERNAME });
      const read = (d.read || []).map(toBook).filter((b) => b.title)
        .sort((a, b) => (b.finished || "").localeCompare(a.finished || "")).slice(0, NUM_BOOKS);
      const reading = (d.reading || []).map(toBook).filter((b) => b.title);
      return { read, reading };
    } catch (e) {
      if (/HARDCOVER_TOKEN/.test(e.message)) throw e;
      errors.push(e.message);
    }
  }
  throw new Error(errors.join(" || "));
}

module.exports = async function handler(req, res) {
  let books = [], reading = null, source = "hardcover", note = null;
  try {
    const hc = await fetchHardcover();
    books = hc.read; reading = hc.reading;
    if (!books.length) throw new Error("Hardcover returned no read books");
  } catch (e) {
    note = String(e.message || e);
    source = "goodreads";
    reading = null; // unknown: the page keeps its written text
    try {
      books = (await fetchGoodreads()).slice(0, NUM_BOOKS).map((b) => ({ ...b, finished: null }));
    } catch (e2) {
      res.status(502).json({ error: note + " | Goodreads: " + (e2.message || e2), books: [] });
      return;
    }
  }
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({ source, note, reading, books });
};
