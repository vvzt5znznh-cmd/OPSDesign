#!/usr/bin/env bash
# Copy the Vite production build to the repo root for GitHub Pages
# (Settings → Pages → Deploy from a branch → main /).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
npm run build
cp dist/index.html index.html
cp dist/index.html 404.html
rm -rf assets
cp -R dist/assets assets
touch .nojekyll
echo "Published dist/ to repo root for GitHub Pages."
