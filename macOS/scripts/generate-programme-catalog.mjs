#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const sourcePath = path.join(repositoryRoot, "data.js");
const outputPath = path.join(
  repositoryRoot,
  "macOS/Sources/MathStudyPlannerApp/Resources/programme-catalog.json",
);

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });

const payload = {
  STUDY_PROGRAM: context.window.STUDY_PROGRAM,
  STUDY_DOMAINS: context.window.STUDY_DOMAINS,
  WEEK_TEMPLATES: context.window.WEEK_TEMPLATES,
  SESSION_SLOTS: context.window.SESSION_SLOTS,
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(outputPath);
