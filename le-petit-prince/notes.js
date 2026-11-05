// ============================================================
// YOUR NOTES ON EACH LE PETIT PRINCE BOOK
//
// How it works:
//  - On the left (in quotes): part of the book's title, exactly as it shows
//    on the site. A short, distinctive part is enough.
//  - On the right (between the backticks ` `): your note. It can be as long
//    as you like and run over several lines.
//  - Leave the backticks empty (``) for books without a note yet.
//  - Formatting works: <strong>bold</strong>, <em>italic</em>,
//    and <p>…</p> around each paragraph if you write more than one.
//  - Every line except the last ends with a comma.
//
// Got a new copy? Add a new line in the same format.
// ============================================================

window.PETIT_PRINCE_NOTES = {
  "El petit princep": `La Central del Raval. Barcelona. October 2026`,
  "Il piccolo principe": `Libreria Panisperna 220. Rome. October 2026`,
  "Er principetto": `Feltrinelli. Rome. October 2026`,
  "Le Petit Prince (Collection Folio": `FNAC. Cannes. October 2026`,
  "Édition collector 80 ans": `Shakespeare and Company. Paris. October 2026`,
  "'t Klein prinske": `Athenaeum Boekhandel. Amsterdam. October 2026`,
  "An Tsakam ts'alej": `UNAM Bookstore. CDMX. August 2026`,
  "De lytse prins": `Athenaeum Boekhandel. Amsterdam. October 2026`,
};

// ------------------------------------------------------------
// LANGUAGE LABELS: use these to correct the language shown
// for a book (same title-matching as above).
// ------------------------------------------------------------
window.PETIT_PRINCE_LANGUAGES = {
  "An Tsakam ts'alej": "Téenek",
};

// ------------------------------------------------------------
// CITIES FOR THE MAP
// The map reads the city from each note above (the part after the
// first full stop: "Bookstore. CITY. Month Year").
// Each city used in a note needs a line here:
//   "As written in the note": { name: "Shown on the map", country: "Country", lat: …, lon: … },
// To get lat/lon: right-click the spot in Google Maps; the first number
// it shows is lat, the second is lon.
// Country names must match the map's names (e.g. "United States of America",
// "United Kingdom", "Netherlands", "Brazil", "Japan").
// ------------------------------------------------------------
window.PETIT_PRINCE_CITIES = {
  "CDMX":      { name: "Mexico City", country: "Mexico",      lat: 19.4326, lon: -99.1332 },
  "Barcelona": { name: "Barcelona",   country: "Spain",       lat: 41.3874, lon: 2.1686 },
  "Rome":      { name: "Rome",        country: "Italy",       lat: 41.9028, lon: 12.4964 },
  "Cannes":    { name: "Cannes",      country: "France",      lat: 43.5528, lon: 7.0174 },
  "Paris":     { name: "Paris",       country: "France",      lat: 48.8566, lon: 2.3522 },
  "Amsterdam": { name: "Amsterdam",   country: "Netherlands", lat: 52.3676, lon: 4.9041 },
};
