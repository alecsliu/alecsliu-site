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

var LT_USER = "seansal";

// Name of the LibraryThing collection that holds your
// Le Petit Prince books (exactly as it appears on LibraryThing).
var LT_PETIT_PRINCE_COLLECTION = "The Little Prince";

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
      entered: Number(book.entry_stamp) || Date.parse(book.entry_date || "") / 1000 || 0,
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

// ------------------------------------------------------------
// Cover grid, shared by both pages.
//   renderCovers(element, books, { notes: {...} })
// With notes, clicking a cover opens a panel with the note.
// ------------------------------------------------------------
(function () {
  function findNote(book, notes) {
    if (!notes) return "";
    if (notes[book.id]) return notes[book.id];
    function norm(x) { return String(x).normalize("NFC").replace(/[\u2018\u2019]/g, "'").trim().toLowerCase(); }
    var t = norm(book.title);
    for (var k0 in notes) { if (norm(k0) === t && String(notes[k0]).trim()) return notes[k0]; }
    var keys = Object.keys(notes).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < keys.length; i++) {
      var k = norm(keys[i]);
      if (k && t.indexOf(k) !== -1 && String(notes[keys[i]]).trim()) return notes[keys[i]];
    }
    return "";
  }

  var LANG_LABELS = { fry: "Frisian", fy: "Frisian" };
  function langName(code) {
    if (LANG_LABELS[code]) return LANG_LABELS[code];
    try {
      var n = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
      return n && n !== code ? n : code;
    } catch (e) { return code; }
  }

  var dialog;
  function openPanel(book, note) {
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "panel";
      document.body.appendChild(dialog);
      dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    }
    var meta = [book.language && langName(book.language), book.date].filter(Boolean).join(" · ");
    dialog.innerHTML =
      '<button class="close" aria-label="Close">×</button>' +
      '<div class="panel-body">' +
        (book.cover ? '<img src="' + escapeHTML(book.cover) + '" alt="">' : "") +
        "<div><h3>" + escapeHTML(book.title) + "</h3>" +
        (meta ? '<p class="muted">' + escapeHTML(meta) + "</p>" : "") +
        (note ? '<div class="note">' + note + "</div>" : "") +
        '<p><a href="' + escapeHTML(book.link) + '" target="_blank" rel="noopener">View on LibraryThing</a></p></div>' +
      "</div>";
    dialog.querySelector(".close").onclick = function () { dialog.close(); };
    dialog.showModal();
  }

  window.findBookNote = findNote;
  window.languageName = langName;

  window.renderCovers = function (el, books, opts) {
    opts = opts || {};
    if (opts.languages) {
      books.forEach(function (b) { var l = findNote(b, opts.languages); if (l) b.language = l; });
    }
    if (!books.length) { el.innerHTML = '<p class="status">' + (opts.empty || "Nothing here.") + "</p>"; return; }
    el.innerHTML = '<ul class="covers">' + books.map(function (b, i) {
      var art = b.cover ? '<img src="' + escapeHTML(b.cover) + '" alt="" loading="lazy">' : "<span>" + escapeHTML(b.title) + "</span>";
      var meta = [b.language && langName(b.language), b.date].filter(Boolean).join(" · ");
      var hasNote = opts.notes && findNote(b, opts.notes);
      var open = opts.notes ? '<a href="#" data-i="' + i + '">' : '<a href="' + escapeHTML(b.link) + '" target="_blank" rel="noopener">';
      return "<li>" + open + '<span class="art">' + art + '</span><span class="cap">' + escapeHTML(b.title) +
        (b.author && opts.showAuthor ? "<small>" + escapeHTML(b.author) + "</small>" : "") +
        (meta && !opts.showAuthor ? "<small>" + escapeHTML(meta) + "</small>" : "") +
        (hasNote ? '<small class="has-note">Note</small>' : "") +
        "</span></a></li>";
    }).join("") + "</ul>";
    if (opts.notes) {
      el.querySelectorAll("a[data-i]").forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          var b = books[+a.getAttribute("data-i")];
          openPanel(b, findNote(b, opts.notes));
        });
      });
    }
  };
})();
