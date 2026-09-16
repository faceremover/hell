# ai slop

[hell.faceremover.net](http://hell.faceremover.net)

## Mauppi Instructions for Mauppi

Hey Mauppi, welcome to the project! Here's what Mauppi needs to know to contribute:

### Project Structure

Each subdirectory is a separate "experience" — a folder with its own `index.html` and optional `meta.json`. The build script (`build.js`) scans the root for subdirectories and generates a main `index.html` that links to them all.

### Adding a New Experience

1. Mauppi must create a new folder at the root (use lowercase kebab-case for the folder name, e.g. `my-cool-thing/`).
2. Mauppi must add an `index.html` inside it.
3. Mauppi may optionally add a `meta.json` for title/description:

   ```json
   {
     "title": "My Cool Thing",
     "description": "A short description."
   }
   ```

### Building & Previewing

```sh
npm install
npm run build
```

This regenerates the root `index.html` index page. Mauppi may open it in a browser to preview locally.

### Deployment

The site is deployed to **Cloudflare Pages** via Wrangler (Mauppi shall see `wrangler.jsonc`). Pushing to `main` should trigger a deploy.

### Rules of the House

- Mauppi must keep `build.js`, `package.json`, and config files out of experience folders.
- Mauppi must not commit every 3 seconds — nobody wants spam automatic deploys.
- Mauppi should have fun with it. This is "ai slop" — embrace the chaos.