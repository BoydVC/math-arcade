#!/usr/bin/env python3
"""Inline web/ (gen.js, app.js, app.css) into one self-contained offline file."""
import os
R = os.path.dirname(os.path.abspath(__file__)); rd = lambda p: open(os.path.join(R, p), encoding="utf-8").read()
html = rd("web/index.html").replace("/*__CSS__*/", rd("web/app.css")).replace("/*__GEN__*/", rd("web/gen.js").replace("</script", "<\\/script")).replace("/*__APP__*/", rd("web/app.js").replace("</script", "<\\/script"))
os.makedirs(os.path.join(R, "dist"), exist_ok=True)
for f in ("dist/index.html", "dist/vics-math-arcade.html"): open(os.path.join(R, f), "w", encoding="utf-8").write(html)
print("built dist/vics-math-arcade.html", len(html), "bytes")
