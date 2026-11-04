/**
 * PDF.js Worker Copy Script
 *
 * Copies the PDF.js worker from node_modules to public/ for self-hosting.
 * This eliminates CDN dependencies and enables strict CSP compliance.
 *
 * Run automatically via:
 * - npm run prebuild
 * - npm run predev
 * - npm run postinstall
 *
 * @fileoverview Zero-Knowledge Document Pipeline - Build Tool
 * @version 1.0.0
 * @license Proprietary - Financial Planner AI, LLC
 */

const fs = require("fs")
const path = require("path")

// Paths
const sourceFile = path.join(__dirname, "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs")
const targetDir = path.join(__dirname, "../public/pdfjs")
const targetFile = path.join(targetDir, "pdf.worker.min.mjs")

// Version file for tracking
const versionFile = path.join(targetDir, "VERSION.txt")

console.log("[PDF.js Worker] Starting copy process...")

// Check if source exists
if (!fs.existsSync(sourceFile)) {
  console.error("[PDF.js Worker] ❌ Source file not found:", sourceFile)
  console.error('[PDF.js Worker] Run "npm install pdfjs-dist" first.')
  process.exit(1)
}

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
  console.log("[PDF.js Worker] Created directory:", targetDir)
}

// Copy the worker file
try {
  fs.copyFileSync(sourceFile, targetFile)
} catch (error) {
  console.error("[PDF.js Worker] ❌ Failed to copy worker:", error.message)
  process.exit(1)
}

// Get version info
let version = "unknown"
try {
  const packageJsonPath = path.join(__dirname, "../node_modules/pdfjs-dist/package.json")
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
  version = packageJson.version
} catch {
  console.warn("[PDF.js Worker] ⚠️ Could not read pdfjs-dist version")
}

// Write version file for debugging/auditing
const versionInfo = `pdfjs-dist@${version}
Copied: ${new Date().toISOString()}
Source: node_modules/pdfjs-dist/build/pdf.worker.min.mjs
`
fs.writeFileSync(versionFile, versionInfo)

// Get file size for verification
const stats = fs.statSync(targetFile)
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)

console.log(`[PDF.js Worker] ✓ Copied pdf.worker.min.mjs (pdfjs-dist@${version})`)
console.log(`[PDF.js Worker] ✓ Size: ${sizeMB} MB`)
console.log(`[PDF.js Worker] ✓ Location: public/pdfjs/pdf.worker.min.mjs`)
console.log("[PDF.js Worker] ✓ CSP: worker-src 'self' is now supported")
