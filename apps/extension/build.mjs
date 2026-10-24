import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionRoot = __dirname;
const distDir = path.resolve(extensionRoot, "dist");

async function runBuild() {
  console.log("Building FocusForge Chrome Extension...");

  // 1. Clean dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // 2. Build Background Service Worker (ES module)
  await build({
    root: extensionRoot,
    configFile: false,
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

  // 3. Build HTML Pages (popup.html and blocked.html)
  // We place HTML files directly into dist root with relative asset links
  await build({
    root: path.resolve(extensionRoot, "src"),
    base: "./",
    configFile: false,
    build: {
      outDir: distDir,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: path.resolve(extensionRoot, "src/popup/popup.html"),
          blocked: path.resolve(extensionRoot, "src/blocked/blocked.html"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name].js",
          assetFileNames: "[name].[ext]",
        },
      },
    },
  });

  // If Vite nested the HTML files inside dist/popup/ or dist/blocked/, flatten them to dist/
  if (fs.existsSync(path.resolve(distDir, "popup/popup.html"))) {
    let popupHtml = fs.readFileSync(path.resolve(distDir, "popup/popup.html"), "utf-8");
    popupHtml = popupHtml.replace(/\.\.\//g, "./");
    fs.writeFileSync(path.resolve(distDir, "popup.html"), popupHtml);
    fs.rmSync(path.resolve(distDir, "popup"), { recursive: true, force: true });
  }

  if (fs.existsSync(path.resolve(distDir, "blocked/blocked.html"))) {
    let blockedHtml = fs.readFileSync(path.resolve(distDir, "blocked/blocked.html"), "utf-8");
    blockedHtml = blockedHtml.replace(/\.\.\//g, "./");
    fs.writeFileSync(path.resolve(distDir, "blocked.html"), blockedHtml);
    fs.rmSync(path.resolve(distDir, "blocked"), { recursive: true, force: true });
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
