// ============================================================
// Le Petit Prince map. Draws the world map, one pin per city,
// the country dropdown, and the list of copies under the map.
// You shouldn't need to edit this file: cities live in notes.js.
// ============================================================
(function () {
  var NS = "http://www.w3.org/2000/svg";

  // Natural Earth projection (same as the generated map data)
  function project(lon, lat) {
    var M = window.LPP_MAP;
    var l = lon * Math.PI / 180, p = lat * Math.PI / 180, p2 = p * p, p4 = p2 * p2;
    var x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
    var y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    return [M.tx + M.k * x, M.ty - M.k * y];
  }

  function esc(s) { return escapeHTML(s == null ? "" : s); }

  // copies: [{ book, note, store, date, cityKey }]
  window.renderPetitPrinceMap = function (root, copies) {
    var M = window.LPP_MAP, CITIES = window.PETIT_PRINCE_CITIES || {};
    var placed = copies.filter(function (c) { return CITIES[c.cityKey]; });
    if (!M || !placed.length) { root.hidden = true; return; }

    var byCity = {}, countries = {};
    placed.forEach(function (c) {
      (byCity[c.cityKey] = byCity[c.cityKey] || []).push(c);
      countries[CITIES[c.cityKey].country] = true;
    });
    var cityKeys = Object.keys(byCity);
    var countryList = Object.keys(countries).sort();

    root.innerHTML =
      '<div class="map-bar"><div class="dd">' +
        '<button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false">' +
          '<span class="dd-val">All countries</span><span class="dd-chev" aria-hidden="true"></span></button>' +
        '<div class="dd-panel" hidden>' +
          '<input type="search" class="dd-search" placeholder="Search countries" aria-label="Search countries" autocomplete="off">' +
          '<ul class="dd-list" role="listbox"></ul>' +
          '<p class="dd-empty" hidden>No matches</p>' +
        "</div></div></div>" +
      '<div class="map-wrap"><svg class="map" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of where each copy was bought">' +
        '<path class="land" d="' + M.land + '"/><path class="borders" d="' + M.borders + '"/><g class="pins"></g></svg></div>' +
      '<div class="map-detail"></div>';

    var svg = root.querySelector("svg"), pinsG = root.querySelector(".pins");
    var detail = root.querySelector(".map-detail");

    var pins = cityKeys.map(function (k) {
      var info = CITIES[k], pt = project(info.lon, info.lat), n = byCity[k].length;
      var g = document.createElementNS(NS, "g");
      g.setAttribute("class", "pin"); g.setAttribute("tabindex", "0");
      g.setAttribute("aria-label", info.name + ": " + n + (n === 1 ? " copy" : " copies"));
      g.innerHTML = '<circle class="halo"/><circle class="dot"/><text class="num" text-anchor="middle"></text><text class="label"></text>';
      g.querySelector(".num").textContent = n > 1 ? n : "";
      g.querySelector(".label").textContent = info.name;
      g.addEventListener("click", function () { showCity(k); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter") showCity(k); });
      pinsG.appendChild(g);
      return { key: k, g: g, pt: pt, n: n, name: info.name };
    });

    function copyRows(list) {
      return list.map(function (c) {
        var b = c.book;
        var art = b.cover ? '<img src="' + esc(b.cover) + '" alt="" loading="lazy">' : "";
        var meta = [b.language && languageName(b.language), b.date].filter(Boolean).join(" · ");
        var where = [c.store, c.date].filter(Boolean).join(" · ");
        return '<a class="copy" href="' + esc(b.link) + '" target="_blank" rel="noopener"><span class="cov">' + art + "</span><span>" +
          '<span class="t">' + esc(b.title) + "</span>" +
          (meta ? '<span class="m">' + esc(meta) + "</span>" : "") +
          (where ? '<span class="m">' + esc(where) + "</span>" : "") + "</span></a>";
      }).join("");
    }

    function showCity(k) {
      pins.forEach(function (p) { p.g.classList.toggle("active", p.key === k); });
      var list = byCity[k], info = CITIES[k];
      detail.innerHTML = "<h3>" + esc(info.name) + '</h3><p class="muted">' + esc(info.country) + " · " + list.length +
        (list.length === 1 ? " copy" : " copies") + "</p>" + copyRows(list);
    }

    function showCountry(country) {
      pins.forEach(function (p) { p.g.classList.toggle("active", CITIES[p.key].country === country); });
      var list = placed.filter(function (c) { return CITIES[c.cityKey].country === country; });
      detail.innerHTML = "<h3>" + esc(country) + '</h3><p class="muted">' + list.length + (list.length === 1 ? " copy" : " copies") + "</p>" + copyRows(list);
    }

    // ---- views & zoom ----
    function aspect() { return (svg.clientWidth || M.W) / (svg.clientHeight || M.H); }
    function fitBox(x0, y0, x1, y1, pad) {
      x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
      var w = x1 - x0, h = y1 - y0, a = aspect();
      if (w / h > a) { var nh = w / a; y0 -= (nh - h) / 2; h = nh; } else { var nw = h * a; x0 -= (nw - w) / 2; w = nw; }
      return [x0, y0, w, h];
    }
    function fitPins(list, pad) {
      var xs = list.map(function (p) { return p.pt[0]; }), ys = list.map(function (p) { return p.pt[1]; });
      return fitBox(Math.min.apply(0, xs), Math.min.apply(0, ys), Math.max.apply(0, xs), Math.max.apply(0, ys), pad);
    }
    function viewFor(country) {
      if (!country) return fitPins(pins, 70);
      var inC = pins.filter(function (p) { return CITIES[p.key].country === country; });
      var b = M.countries[country];
      if (b) {
        // country outline, stretched to include its pins
        inC.forEach(function (p) { b = [Math.min(b[0], p.pt[0]), Math.min(b[1], p.pt[1]), Math.max(b[2], p.pt[0]), Math.max(b[3], p.pt[1])]; });
        return fitBox(b[0], b[1], b[2], b[3], Math.max(4, (b[2] - b[0]) * 0.12));
      }
      return fitPins(inC, 40);
    }

    var current = "", cur = viewFor("");

    function draw(vb) {
      svg.setAttribute("viewBox", vb.join(" "));
      var s = vb[2] / (svg.clientWidth || M.W); // map units per screen pixel
      svg.querySelector(".borders").setAttribute("stroke-width", (1.1 * s).toFixed(4));
      var boxes = [];
      // place pins; bigger groups first so they win label space
      pins.slice().sort(function (a, b) { return b.n - a.n; }).forEach(function (p) {
        var g = p.g, x = p.pt[0], y = p.pt[1], r = (p.n > 1 ? 9 : 6) * s;
        var dot = g.querySelector(".dot"), halo = g.querySelector(".halo"), num = g.querySelector(".num"), lab = g.querySelector(".label");
        dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", r); dot.setAttribute("stroke-width", 1.5 * s);
        halo.setAttribute("cx", x); halo.setAttribute("cy", y); halo.setAttribute("r", r * 2.2);
        num.setAttribute("x", x); num.setAttribute("y", y + 4 * s); num.setAttribute("font-size", 11 * s);
        lab.setAttribute("font-size", 13 * s); lab.setAttribute("stroke-width", 3 * s); lab.setAttribute("y", y + 4.5 * s);
        boxes.push([x - r * 1.3, y - r * 1.3, x + r * 1.3, y + r * 1.3]); // the pin itself
      });
      var pinBoxes = boxes.slice(), labelBoxes = [];
      pins.slice().sort(function (a, b) { return b.n - a.n; }).forEach(function (p, i) {
        var lab = p.g.querySelector(".label"), x = p.pt[0], y = p.pt[1], r = (p.n > 1 ? 9 : 6) * s;
        var w = p.name.length * 7.4 * s, h = 15 * s, shown = false;
        [["start", x + r + 5 * s], ["end", x - r - 5 * s]].some(function (opt) {
          var bx = opt[0] === "start" ? [opt[1], y - h / 2, opt[1] + w, y + h / 2] : [opt[1] - w, y - h / 2, opt[1], y + h / 2];
          var outside = bx[0] < vb[0] || bx[2] > vb[0] + vb[2] || bx[1] < vb[1] || bx[3] > vb[1] + vb[3];
          var hit = outside || labelBoxes.concat(pinBoxes.filter(function (_, j) { return j !== i; })).some(function (o) {
            return !(bx[2] < o[0] || bx[0] > o[2] || bx[3] < o[1] || bx[1] > o[3]);
          });
          if (!hit) { lab.setAttribute("text-anchor", opt[0]); lab.setAttribute("x", opt[1]); labelBoxes.push(bx); shown = true; }
          return shown;
        });
        lab.style.display = shown ? "" : "none";
      });
    }

    function animateTo(target) {
      var from = cur.slice(), t0 = performance.now(), D = 600;
      function step(t) {
        var k = Math.min(1, (t - t0) / D); k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        cur = from.map(function (v, i) { return v + (target[i] - v) * k; });
        draw(cur);
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function choose(value) {
      current = value;
      animateTo(viewFor(current));
      if (current) showCountry(current);
      else {
        pins.forEach(function (p) { p.g.classList.remove("active"); });
        detail.innerHTML = "";
      }
    }

    // ---- custom dropdown with search ----
    var dd = root.querySelector(".dd"), btn = dd.querySelector(".dd-btn"), panel = dd.querySelector(".dd-panel");
    var search = dd.querySelector(".dd-search"), ul = dd.querySelector(".dd-list"), none = dd.querySelector(".dd-empty");
    var counts = {}; placed.forEach(function (c) { var k = CITIES[c.cityKey].country; counts[k] = (counts[k] || 0) + 1; });
    var options = [{ v: "", label: "All countries", n: placed.length }].concat(
      countryList.map(function (c) { return { v: c, label: c, n: counts[c] }; }));
    var activeIdx = 0, visible = options;

    function renderOptions() {
      var t = search.value.trim().toLowerCase();
      visible = options.filter(function (o) { return !t || o.label.toLowerCase().indexOf(t) !== -1; });
      ul.innerHTML = visible.map(function (o, i) {
        return '<li role="option" data-i="' + i + '" aria-selected="' + (o.v === current) + '"' + (i === activeIdx ? ' class="active"' : "") + ">" +
          '<span>' + esc(o.label) + '</span><span class="dd-n">' + o.n + "</span></li>";
      }).join("");
      none.hidden = visible.length > 0;
    }
    function open() {
      panel.hidden = false; btn.setAttribute("aria-expanded", "true"); dd.classList.add("open");
      search.value = ""; activeIdx = Math.max(0, options.findIndex(function (o) { return o.v === current; }));
      renderOptions(); search.focus();
    }
    function close(focusBtn) {
      panel.hidden = true; btn.setAttribute("aria-expanded", "false"); dd.classList.remove("open");
      if (focusBtn) btn.focus();
    }
    function pick(o) {
      dd.querySelector(".dd-val").textContent = o.label;
      close(true); choose(o.v);
    }
    btn.addEventListener("click", function () { panel.hidden ? open() : close(); });
    search.addEventListener("input", function () { activeIdx = 0; renderOptions(); });
    search.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); activeIdx = Math.min(visible.length - 1, activeIdx + 1); renderOptions(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); activeIdx = Math.max(0, activeIdx - 1); renderOptions(); }
      else if (e.key === "Enter") { e.preventDefault(); if (visible[activeIdx]) pick(visible[activeIdx]); }
      else if (e.key === "Escape") { close(true); }
    });
    ul.addEventListener("mousedown", function (e) { e.preventDefault(); }); // keep focus in the search box
    ul.addEventListener("click", function (e) {
      var li = e.target.closest("li"); if (li) pick(visible[+li.getAttribute("data-i")]);
    });
    document.addEventListener("click", function (e) { if (!dd.contains(e.target) && !panel.hidden) close(); });

    window.addEventListener("resize", function () { cur = viewFor(current); draw(cur); });
    draw(cur);
  };
})();
