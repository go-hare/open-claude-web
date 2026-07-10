import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "src");
const coworkRoot = path.join(sourceRoot, "features/cowork");
const codeRoots = [
  path.join(sourceRoot, "features/epitaxy"),
  path.join(sourceRoot, "features/scheduled"),
];
const legacyCoworkRoots = [
  path.join(sourceRoot, "features/epitaxy/cowork"),
  path.join(sourceRoot, "features/epitaxy/OfficialCoworkComposer.tsx"),
  path.join(sourceRoot, "features/epitaxy/CoworkNewTaskPage.tsx"),
];
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const failures = [];

function walkSourceFiles(root) {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return walkSourceFiles(target);
    return sourceExtensions.has(path.extname(entry.name)) ? [target] : [];
  });
}

function isInside(file, root) {
  const relative = path.relative(root, file);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isLegacyCowork(file) {
  return legacyCoworkRoots.some((root) => isInside(file, root));
}

function relativeFile(file) {
  return path.relative(repoRoot, file).split(path.sep).join("/");
}

function importSpecifiers(source) {
  const pattern = /(?:from\s+|import\s*\(\s*|import\s*)["']([^"']+)["']/g;
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

function resolvedImport(file, specifier) {
  if (!specifier.startsWith(".")) return null;
  return path.normalize(path.resolve(path.dirname(file), specifier));
}

function reportImportFailure(file, specifier, reason) {
  failures.push(`${relativeFile(file)} imports ${specifier}: ${reason}`);
}

function verifyCoworkImports(coworkFiles) {
  for (const file of coworkFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const specifier of importSpecifiers(source)) {
      const resolved = resolvedImport(file, specifier);
      if (resolved && codeRoots.some((root) => isInside(resolved, root))) {
        reportImportFailure(file, specifier, "Cowork business code must not import Code business code");
      }
    }
    if (source.includes("desktopBridge.LocalSessions")) {
      failures.push(`${relativeFile(file)} uses desktopBridge.LocalSessions instead of the Cowork bridge`);
    }
  }
}

function verifyCodeImports(codeFiles) {
  for (const file of codeFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const specifier of importSpecifiers(source)) {
      const resolved = resolvedImport(file, specifier);
      if (resolved && (isInside(resolved, coworkRoot) || isLegacyCowork(resolved))) {
        reportImportFailure(file, specifier, "Code business code must not import Cowork business code");
      }
    }
    const forbidden = ["desktopBridge.LocalAgentModeSessions", "sessionSourceHint", "SessionSurface"];
    for (const token of forbidden) {
      if (source.includes(token)) failures.push(`${relativeFile(file)} contains forbidden Cowork split token ${token}`);
    }
  }
}

function verifyNoLegacyInboundImports(allFiles) {
  for (const file of allFiles) {
    if (isLegacyCowork(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    for (const specifier of importSpecifiers(source)) {
      const resolved = resolvedImport(file, specifier);
      if (resolved && isLegacyCowork(resolved)) {
        reportImportFailure(file, specifier, "active code must not depend on the legacy Cowork copy");
      }
    }
  }
}

function expectText(file, expected, reason) {
  const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
  if (!source.includes(expected)) failures.push(`${file}: ${reason}`);
}

function verifyEntryPoints() {
  expectText("src/app/routes.tsx", "Component: CoworkSessionPage", "Cowork session route is not isolated");
  expectText("src/app/routes.tsx", "Component: EpitaxySessionPage", "Code session route is not isolated");
  expectText("src/app/routes.tsx", "Component: CoworkScheduledTasks", "Cowork scheduled route is not isolated");
  expectText("src/app/routes.tsx", "Component: ScheduledTasks", "Code scheduled route is not isolated");
  expectText("src/features/cowork/scheduled/scheduledPaths.ts", '"/scheduled-task"', "Cowork scheduled path is wrong");
  expectText("src/features/scheduled/scheduledPaths.ts", '"/code/scheduled"', "Code scheduled path is wrong");
  expectText("src/features/cowork/session/coworkSessionBridge.ts", "LocalAgentModeSessions", "Cowork session bridge is wrong");
  expectText("src/features/epitaxy/EpitaxySessionTile.tsx", "desktopBridge.LocalSessions", "Code session bridge is wrong");
  expectText("src/shell/sidebarData.ts", "mode === \"cowork\" ? coworkScheduledTaskIndexPath : codeScheduledTaskIndexPath", "scheduled navigation is not split by mode");
}

const allFiles = walkSourceFiles(sourceRoot);
const coworkFiles = walkSourceFiles(coworkRoot);
const codeFiles = codeRoots.flatMap(walkSourceFiles).filter((file) => !isLegacyCowork(file));
verifyCoworkImports(coworkFiles);
verifyCodeImports(codeFiles);
verifyNoLegacyInboundImports(allFiles);
verifyEntryPoints();

if (failures.length > 0) {
  console.error("Cowork boundary verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Cowork boundary verification passed (${coworkFiles.length} Cowork files, ${codeFiles.length} Code files).`);
