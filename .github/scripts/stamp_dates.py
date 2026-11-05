"""Write each page's "Updated <Month Year>" line from its last real git change.

Runs automatically on GitHub after every push (see .github/workflows/page-dates.yml).
Pages get the line in their footer; Reading and Personal library are skipped
because their content comes live from Goodreads / LibraryThing.
"""
import re, subprocess, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SKIP = {"404.html", "reading/index.html", "library/index.html"}
BOT_MSG = "Update page dates"
MARK = re.compile(r'\n?      <p class="updated">[^<]*</p>')

def last_change(path):
    out = subprocess.run(
        ["git", "log", "-1", "--format=%cs", "--invert-grep", f"--grep={BOT_MSG}", "--", path],
        cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return datetime.date.fromisoformat(out) if out else None

changed = 0
for f in sorted(ROOT.glob("**/*.html")):
    rel = f.relative_to(ROOT).as_posix()
    if rel in SKIP or rel.startswith("templates/") or rel.startswith(".github/"):
        continue
    d = last_change(rel)
    if not d:
        continue
    html = f.read_text()
    line = f'      <p class="updated">Updated {d:%B %Y}</p>'
    new = MARK.sub("", html)
    new = new.replace("      © ", line + "\n      © ", 1)
    if new != html:
        f.write_text(new)
        changed += 1
print(f"{changed} page(s) updated")
