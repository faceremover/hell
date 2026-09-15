const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const IGNORED = new Set(["node_modules", ".git", ".github", "build.js", "package.json", "package-lock.json"]);

function slugToTitle(slug) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildIndex() {
  const entries = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !IGNORED.has(d.name) && fs.existsSync(path.join(ROOT, d.name, "index.html")))
    .map((d) => {
      const dirPath = path.join(ROOT, d.name);
      // Check for optional meta.json
      const metaPath = path.join(dirPath, "meta.json");
      let meta = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        } catch {}
      }
      return {
        slug: d.name,
        title: meta.title || slugToTitle(d.name),
        description: meta.description || "",
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>hell</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
      padding: 3rem 1.5rem;
    }
    h1 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 0.25rem;
      color: #ff4444;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 3rem;
      font-size: 0.9rem;
    }
    .grid {
      max-width: 800px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
    }
    .card {
      background: #161616;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 1.25rem;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.2s, transform 0.2s;
    }
    .card:hover {
      border-color: #ff4444;
      transform: translateY(-2px);
    }
    .card h2 {
      font-size: 1.1rem;
      margin-bottom: 0.35rem;
      color: #fff;
    }
    .card p {
      font-size: 0.85rem;
      color: #888;
      line-height: 1.4;
    }
    .empty {
      text-align: center;
      color: #555;
      margin-top: 4rem;
      font-size: 1rem;
    }
  </style>
</head>
<body>
  <h1>hell</h1>
  <p class="subtitle">${entries.length} project${entries.length !== 1 ? "s" : ""}</p>
  ${
    entries.length
      ? `<div class="grid">${entries
          .map(
            (e) =>
              `<a class="card" href="/${e.slug}/">
        <h2>${e.title}</h2>${e.description ? `<p>${e.description}</p>` : ""}
      </a>`
          )
          .join("\n    ")}</div>`
      : `<p class="empty">No projects yet.</p>`
  }
</body>
</html>
`;

  fs.writeFileSync(path.join(ROOT, "index.html"), html, "utf8");
  console.log(`✓ Built index.html with ${entries.length} project(s).`);
}

buildIndex();
