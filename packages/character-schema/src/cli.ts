#!/usr/bin/env node
// NAIS Character Schema CLI

import { join, resolve } from "node:path";

import { generatePack } from "./generate.js";
import { listCharacterPacks, loadCharacterPack } from "./loader.js";

const [cmd, ...args] = process.argv.slice(2);

async function main(): Promise<void> {
  switch (cmd) {
    case "generate": {
      const opts = parseGenerateArgs(args);
      const dir = generatePack(opts);
      console.log(`Created character pack at: ${dir}`);
      break;
    }
    case "list": {
      const root = args[0] ?? join(process.cwd(), "characters");
      const packPaths = listCharacterPacks(root);
      if (packPaths.length === 0) {
        console.log("No character packs found.");
      } else {
        for (const packPath of packPaths) {
          const pack = loadCharacterPack(packPath);
          const avatarEnabled =
            pack.character.avatar.modes.live2d.enabled || pack.character.avatar.modes.vrm.enabled;
          console.log(
            `  ${pack.character.id}  -  ${pack.character.name}${avatarEnabled ? "  avatar" : ""}`,
          );
        }
        console.log(`\n${packPaths.length} pack(s) total.`);
      }
      break;
    }
    case "validate": {
      const packPath = args[0];
      if (!packPath) {
        console.error("Usage: nais-character-schema validate <path>");
        process.exit(1);
      }
      try {
        const pack = loadCharacterPack(packPath);
        const avatarEnabled =
          pack.character.avatar.modes.live2d.enabled || pack.character.avatar.modes.vrm.enabled;
        console.log(`Pack "${pack.character.id}" is valid.`);
        console.log(
          `   Avatar: ${pack.character.avatar.default_mode} (${avatarEnabled ? "enabled" : "no files"})`,
        );
        console.log(
          `   Voice: ${pack.voice.enabled ? `enabled (${pack.voice.provider ?? "browser"})` : "disabled"}`,
        );
      } catch (error) {
        console.error(`Invalid: ${(error as Error).message}`);
        process.exit(1);
      }
      break;
    }
    default:
      console.log(`NAIS Character Schema CLI

Commands:
  generate  --id <id> --name <name> [--author <author>] [--avatar vrm|live2d] [--desc <desc>] [--out characters]
  list [characters-root]
  validate <pack-path>
`);
      process.exit(cmd ? 1 : 0);
  }
}

function parseGenerateArgs(args: string[]): Parameters<typeof generatePack>[0] {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg?.startsWith("--")) {
      out[arg.slice(2)] = args[i + 1] ?? "";
      i += 1;
    }
  }

  if (!out.id || !out.name) {
    console.error(
      "Usage: nais-character-schema generate --id <id> --name <name> [--author <author>] [--avatar vrm|live2d] [--desc <desc>] [--out characters]",
    );
    process.exit(1);
  }

  const avatarMode = out.avatar ?? "vrm";
  if (avatarMode !== "vrm" && avatarMode !== "live2d") {
    console.error("Invalid --avatar value. Expected 'vrm' or 'live2d'.");
    process.exit(1);
  }

  return {
    id: out.id,
    name: out.name,
    author: out.author,
    avatarMode,
    description: out.desc ?? "",
    outDir: out.out ? resolve(out.out) : join(process.cwd(), "characters"),
  };
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
