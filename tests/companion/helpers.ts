import { existsSync, readFileSync } from "fs";
import { join } from "path";

/** Real de-identified test illustration (kept out of git). Set COMPANION_FIXTURE_DIR to run those tests. */
export function realFixture() {
  const dir = process.env.COMPANION_FIXTURE_DIR;
  if (!dir || !existsSync(join(dir, "blk0.json"))) return null;
  const text = JSON.parse(readFileSync(join(dir, "blk0.json"), "utf8"))[0].sanitizedText as string;
  const a1 = JSON.parse(readFileSync(join(dir, "blk2.json"), "utf8"))[0].atlas_parsed;
  const a2 = JSON.parse(readFileSync(join(dir, "blk1.json"), "utf8"))[0];
  return { text, atlas1: a1, atlas2: a2.atlas2Parsed, atlas2Registry: a2.atlas2EvidenceRegistry };
}
