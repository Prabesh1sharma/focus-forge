import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionRoot = __dirname;
const distDir = path.resolve(extensionRoot, "dist");
const rootDir = path.resolve(extensionRoot, "../..");

// Capture CLI-provided overrides before loading .env
const cliUrl = process.env.FOCUSFORGE_API_URL || process.env.NEXT_PUBLIC_APP_URL;

// Load environment from root .env if present
const rootEnvPath = path.resolve(rootDir, ".env");
if (fs.existsSync(rootEnvPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(rootEnvPath);
  } catch {}
}

const defaultApiUrl = (
  cliUrl ||
  process.env.FOCUSFORGE_API_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://focus-forge-alpha-three.vercel.app"
).replace(/\/+$/, "");

async function runBuild() {
  console.log(`Building FocusForge Chrome Extension (Default API URL: ${defaultApiUrl})...`);

  // 1. Clean dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // 2. Build Background Service Worker (ES module)
  await build({
    root: extensionRoot,
    configFile: false,
    define: {
      __FOCUSFORGE_DEFAULT_API_URL__: JSON.stringify(defaultApiUrl),
    },
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(extensionRoot, "src/background/index.ts"),
        name: "background",
        formats: ["es"],
        fileName: () => "background.js",
      },
      rollupOptions: {
        output: {
          entryFileNames: "background.js",
        },
      },
    },
  });

  // 3. Build HTML Pages (popup.html, blocked.html, options.html)
  // We place HTML files directly into dist root with relative asset links
  await build({
    root: path.resolve(extensionRoot, "src"),
    base: "./",
    configFile: false,
    define: {
      __FOCUSFORGE_DEFAULT_API_URL__: JSON.stringify(defaultApiUrl),
    },
    build: {
      outDir: distDir,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: path.resolve(extensionRoot, "src/popup/popup.html"),
          blocked: path.resolve(extensionRoot, "src/blocked/blocked.html"),
          options: path.resolve(extensionRoot, "src/options/options.html"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name].js",
          assetFileNames: "[name].[ext]",
        },
      },
    },
  });

  // If Vite nested the HTML files inside dist/popup/, dist/blocked/, or dist/options/, flatten them to dist/
  for (const pageName of ["popup", "blocked", "options"]) {
    const nestedPath = path.resolve(distDir, `${pageName}/${pageName}.html`);
    if (fs.existsSync(nestedPath)) {
      let html = fs.readFileSync(nestedPath, "utf-8");
      html = html.replace(/\.\.\//g, "./");
      fs.writeFileSync(path.resolve(distDir, `${pageName}.html`), html);
      fs.rmSync(path.resolve(distDir, pageName), { recursive: true, force: true });
    }
  }

  // 4. Copy manifest.json
  fs.copyFileSync(
    path.resolve(extensionRoot, "manifest.json"),
    path.resolve(distDir, "manifest.json")
  );

  // 5. Copy icons directory
  const iconsDist = path.resolve(distDir, "icons");
  fs.mkdirSync(iconsDist, { recursive: true });
  const iconFiles = fs.readdirSync(path.resolve(extensionRoot, "icons"));
  for (const f of iconFiles) {
    fs.copyFileSync(
      path.resolve(extensionRoot, "icons", f),
      path.resolve(iconsDist, f)
    );
  }

  console.log("Extension build completed successfully into apps/extension/dist!");
}

runBuild().catch((err) => {
  console.error("Extension build failed:", err);
  process.exit(1);
});
