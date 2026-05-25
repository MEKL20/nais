// CLI for validating character packs
// Usage: npx tsx src/cli.ts <character-pack-dir>

import { resolve } from "path";
import { loadCharacterPack, listCharacterPacks, LoaderError } from "./loader.js";
import { CharacterPackSchema } from "./schema.js";

const root = resolve(process.argv[2] ?? "./characters");
const packs = listCharacterPacks(root);

if (packs.length === 0) {
  console.log(`No character packs found under ${root}`);
  process.exit(0);
}

console.log(`Validating ${packs.length} character pack(s)...\n`);
let allOk = true;

for (const packPath of packs) {
  try {
    const pack = loadCharacterPack(packPath);
    const validation = CharacterPackSchema.safeParse(pack);
    if (!validation.success) {
      console.error(`❌ ${packPath}`);
      validation.error.issues.forEach((i) =>
        console.error(`   - ${i.path.join(".")}: ${i.message}`)
      );
      allOk = false;
    } else {
      const enabled =
        pack.character.avatar.modes.live2d.enabled ||
        pack.character.avatar.modes.vrm.enabled;
      console.log(
        `✅ ${pack.character.name} (${packPath}) — ${enabled ? "avatar enabled" : "no avatar enabled"}`
      );
    }
  } catch (err) {
    if (err instanceof LoaderError) {
      console.error(`❌ ${packPath}`);
      console.error(`   ${err.message}`);
    } else {
      console.error(`❌ ${packPath}: ${err}`);
    }
    allOk = false;
  }
}

console.log("");
process.exit(allOk ? 0 : 1);
