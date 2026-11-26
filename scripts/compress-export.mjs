import { constants, brotliCompress, gzip } from "node:zlib";
import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const brotliAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

const TARGET_DIRS = [
  path.resolve(process.cwd(), ".open-next/assets"),
  path.resolve(process.cwd(), ".next/static"),
];
const MIN_BYTES = 512;
const COMPRESSIBLE_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".webmanifest",
  ".svg",
  ".txt",
  ".xml",
]);

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();

      if (COMPRESSIBLE_EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function removeCompressedSidecars(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await removeCompressedSidecars(fullPath);
      } else if (entry.isFile() && /\.(?:gz|br)$/i.test(entry.name)) {
        await rm(fullPath, { force: true });
      }
    }),
  );
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${bytes} B`;
}

async function main() {
  let targetDir = null;

  for (const candidate of TARGET_DIRS) {
    const dirInfo = await stat(candidate).catch(() => null);

    if (dirInfo?.isDirectory()) {
      targetDir = candidate;
      break;
    }
  }

  if (!targetDir) {
    console.warn("[compress-export] Skipping: no .open-next/assets or .next/static directory found.");

    return;
  }

  // Capacitor copies static assets without compressed sidecars.
  if (process.env.CAPACITOR_BUILD === "true") {
    await removeCompressedSidecars(targetDir);
    console.log("[compress-export] Skipped compressed sidecars for Capacitor Android assets.");

    return;
  }

  const files = await collectFiles(targetDir);
  let totalRaw = 0;
  let totalGzip = 0;
  let totalBrotli = 0;
  let compressedCount = 0;

  const concurrency = Math.max(2, Math.min(8, os.cpus().length || 4));
  let cursor = 0;

  async function worker() {
    while (cursor < files.length) {
      const filePath = files[cursor++];
      const raw = await readFile(filePath);

      if (raw.byteLength < MIN_BYTES) continue;

      const [gz, br] = await Promise.all([
        gzipAsync(raw, { level: constants.Z_BEST_COMPRESSION }),
        brotliAsync(raw, {
          params: {
            [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
            [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
            [constants.BROTLI_PARAM_SIZE_HINT]: raw.byteLength,
          },
        }),
      ]);

      totalRaw += raw.byteLength;
      compressedCount += 1;

      if (gz.byteLength < raw.byteLength) {
        await writeFile(`${filePath}.gz`, gz);
        totalGzip += gz.byteLength;
      } else {
        totalGzip += raw.byteLength;
      }

      if (br.byteLength < raw.byteLength) {
        await writeFile(`${filePath}.br`, br);
        totalBrotli += br.byteLength;
      } else {
        totalBrotli += raw.byteLength;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  if (compressedCount === 0 || totalRaw === 0) {
    console.log("[compress-export] No eligible static assets needed compression.");

    return;
  }

  const gzPct = (((totalRaw - totalGzip) / totalRaw) * 100).toFixed(1);
  const brPct = (((totalRaw - totalBrotli) / totalRaw) * 100).toFixed(1);

  console.log(
    `[compress-export] Compressed ${compressedCount} static files (${formatBytes(totalRaw)}) -> Gzip: ${formatBytes(totalGzip)} (-${gzPct}%), Brotli: ${formatBytes(totalBrotli)} (-${brPct}%)`,
  );
}

main().catch((error) => {
  console.error("[compress-export] Compression failed:", error);
  process.exitCode = 1;
});
