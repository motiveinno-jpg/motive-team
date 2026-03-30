#!/usr/bin/env node
/**
 * obfuscate-html.js
 * Extracts inline <script> blocks from HTML files using a parser approach,
 * runs javascript-obfuscator, and re-embeds the result.
 *
 * Usage: node scripts/obfuscate-html.js [file1.html file2.html ...]
 */

const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");

const DEFAULT_FILES = [
  "whistle-app.html",
  "buyer-app.html",
  "admin.html",
];

const LARGE_THRESHOLD = 100000;
const MIN_JS_LENGTH = 500;

const OPTIONS_LARGE = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: false,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  target: "browser",
  numbersToExpressions: true,
  simplify: true,
  splitStrings: false,
};

const OPTIONS_SMALL = {
  ...OPTIONS_LARGE,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  splitStrings: true,
  splitStringsChunkLength: 10,
};

function extractScriptBlocks(html) {
  const blocks = [];
  let pos = 0;

  while (pos < html.length) {
    const openIdx = html.indexOf("<script", pos);
    if (openIdx === -1) break;

    const tagEnd = html.indexOf(">", openIdx);
    if (tagEnd === -1) break;

    const openTag = html.substring(openIdx, tagEnd + 1);
    const contentStart = tagEnd + 1;
    const closeIdx = html.indexOf("</script>", contentStart);
    if (closeIdx === -1) break;

    const jsContent = html.substring(contentStart, closeIdx);
    const closeTag = "</script>";

    blocks.push({
      fullStart: openIdx,
      fullEnd: closeIdx + closeTag.length,
      openTag,
      jsContent,
      closeTag,
    });

    pos = closeIdx + closeTag.length;
  }

  return blocks;
}

function shouldSkip(openTag) {
  if (/src\s*=/i.test(openTag)) return true;
  if (/type\s*=\s*["']text\/babel["']/i.test(openTag)) return true;
  if (/type\s*=\s*["'](?!text\/javascript|application\/javascript|module)["']/i.test(openTag)) return true;
  return false;
}

function obfuscateHtml(filePath) {
  const startTime = Date.now();
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);
  const blocks = extractScriptBlocks(content);

  let obfuscatedCount = 0;
  let errorCount = 0;
  const totalScripts = blocks.length;

  const replacements = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const trimmed = block.jsContent.trim();

    if (shouldSkip(block.openTag)) continue;
    if (trimmed.length < MIN_JS_LENGTH) continue;

    const isLarge = trimmed.length > LARGE_THRESHOLD;
    const options = isLarge ? OPTIONS_LARGE : OPTIONS_SMALL;
    const sizeLabel = isLarge ? "LARGE" : "small";

    process.stdout.write(`  [${i + 1}/${totalScripts}] ${sizeLabel} (${(trimmed.length / 1024).toFixed(0)}KB)...`);

    try {
      const result = JavaScriptObfuscator.obfuscate(trimmed, options);
      const obfuscatedCode = result.getObfuscatedCode();

      replacements.push({
        start: block.fullStart,
        end: block.fullEnd,
        replacement: block.openTag + obfuscatedCode + block.closeTag,
      });

      obfuscatedCount++;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(` done [${elapsed}s]`);
    } catch (err) {
      errorCount++;
      console.log(` FAILED: ${err.message.substring(0, 100)}`);
    }
  }

  let result = content;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    result = result.substring(0, r.start) + r.replacement + result.substring(r.end);
  }

  fs.writeFileSync(filePath, result, "utf-8");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const originalKB = (Buffer.byteLength(content) / 1024).toFixed(0);
  const newKB = (Buffer.byteLength(result) / 1024).toFixed(0);

  console.log(
    `  ${fileName}: ${obfuscatedCount}/${totalScripts} scripts obfuscated ` +
    `(${originalKB}KB -> ${newKB}KB) [${elapsed}s]` +
    (errorCount > 0 ? ` | ${errorCount} errors` : "")
  );

  return { obfuscatedCount, errorCount };
}

function main() {
  const args = process.argv.slice(2);
  const files = args.length > 0 ? args : DEFAULT_FILES;

  console.log("🔒 JavaScript Obfuscation Starting...\n");

  let totalObfuscated = 0;
  let totalErrors = 0;

  for (const file of files) {
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      console.error(`  File not found: ${file}`);
      totalErrors++;
      continue;
    }
    const { obfuscatedCount, errorCount } = obfuscateHtml(filePath);
    totalObfuscated += obfuscatedCount;
    totalErrors += errorCount;
  }

  console.log(`\n✅ Done: ${totalObfuscated} script blocks obfuscated`);
  if (totalErrors > 0) {
    console.log(`⚠️  ${totalErrors} errors (original code preserved)`);
    process.exit(1);
  }
}

main();
