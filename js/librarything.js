// ============================================================
// LibraryThing loader, shared by the Personal Library and
// Le Petit Prince pages.
//
// LibraryThing's API only allows loading in the visitor's
// browser, which is what this does.
//
// Change the username below to yours. Your LibraryThing
// catalogue needs to be public.
// ============================================================

var LT_USER = "YOUR_LIBRARYTHING_USERNAME";

// Name of the LibraryThing collection that holds your
// Le Petit Prince books (exactly as it appears on LibraryThing).
var LT_PETIT_PRINCE_COLLECTION = "Le Petit Prince";

// ------------------------------------------------------------

(function () {
  function collectionNames(book) {
    var c = book.collections || book.collection || [];
    var names = [];
    if (typeof c === "string") names = c.split(",");
    else if (Array.isArray(c)) names = c.map(function (x) { return typeof x === "string" ? x : (x && (x.name || x.title)) || ""; });
    else if (typeof c === "object") names = Object.keys(c).map(function (k) { var v = c[k]; return typeof v === "string" ? v : (v && (v.name || v.title)) || k; });
    return names.map(function (n) { return String(n).trim().toLowerCase(); });
  }

  function normalise(book) {
    return {
      id: book.book_id,
      title: book.title || "Untitled",
      author: book.author_fl || book.author || "",
      authorSort: (book.author_lf || book.author_fl || "").toLowerCase(),
      cover: book.cover && !/nocover|nopic/i.test(book.cover) ? book.cover.replace(/^http:/, "https:") : "",
      date: book.publicationdate || book.date || "",
      language: book.language_main || book.language || "",
      link: "https://www.librarything.com/work/book/" + book.book_id,
      collections: collectionNames(book),
    };
  }

  // load(function (books) {...}, function (message) {...})
  window.loadLibraryThing = function (onBooks, onError) {
    if (!LT_USER || LT_USER.indexOf("YOUR_") === 0) {
      onError("not-configured");
      return;
    }
    var done = false;
    window.__ltCallback = function (data) {
      done = true;
      var raw = (data && data.books) || {};
      var books = Object.keys(raw).map(function (k) { return normalise(raw[k]); });
      onBooks(books);
    };
    var s = document.createElement("script");
    s.src = "https://www.librarything.com/api_getdata.php" +
      "?userid=" + encodeURIComponent(LT_USER) +
      "&showstructure=0&max=20000&showCollections=1&booksort=author,title" +
      "&coverheight=300&callback=__ltCallback";
    s.onerror = function () { if (!done) onError("failed"); };
    s.onload = function () { setTimeout(function () { if (!done) onError("failed"); }, 50); };
    document.body.appendChild(s);
  };

  window.inCollection = function (book, name) {
    return book.collections.indexOf(String(name).trim().toLowerCase()) !== -1;
  };

  window.escapeHTML = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
})();
