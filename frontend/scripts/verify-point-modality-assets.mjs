import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ASSETS_JS = path.join(ROOT, "src/frontend/lib/config/pointModalityAssets.js");
const ASSET_DIR = path.join(ROOT, "public/Img/point-modality");

function collectPngFilenames() {
  const text = fs.readFileSync(ASSETS_JS, "utf8");
  const matches = [...text.matchAll(/:\s*"([^"]+\.png)"/g)];
  return [...new Set(matches.map((m) => m[1]))].sort();
}

function main() {
  const expected = collectPngFilenames();
  const missing = [];
  const present = [];

  for (const file of expected) {
    const full = path.join(ASSET_DIR, file);
    if (fs.existsSync(full)) {
      present.push(file);
    } else {
      missing.push(file);
    }
  }

  console.log(`Point modality assets: ${present.length}/${expected.length} present`);
  if (present.length) {
    console.log("\nFound:");
    for (const file of present) console.log(`  ✓ ${file}`);
  }
  if (missing.length) {
    console.log("\nMissing:");
    for (const file of missing) console.log(`  ✗ ${file}`);
    console.log(`\nGenerate PNGs per docs/POINT_MODALITY_ASSET_PROMPTS.md → public/Img/point-modality/`);
    process.exitCode = 1;
  }
}

main();
