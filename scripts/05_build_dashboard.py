"""Step 5 (old public dashboard, retired from web/): embed web_src/data.json into the dashboard template.

web/ now holds only the back-office page (built by 18_build_backoffice.py), so this writes to web_src/ instead:
web_src/old/site_index.html  -> full standalone page, open locally
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "web_src"
tpl = (SRC / "dashboard_template.html").read_text()
data = (SRC / "data.json").read_text().replace("</", "<\\/")
page = tpl.replace("/*__DATA__*/", data)
out = SRC / "old/site_index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(
    '<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    "<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n"
    + page + "\n</body>\n</html>\n")
print(f"built {out.relative_to(ROOT)}")
