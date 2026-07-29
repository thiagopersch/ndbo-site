import fs from "node:fs";
import { parseObd } from "../lib/obd/obd-parser";
import { renderLooktypeFrames } from "../lib/obd/obd-render";

const files = [
  "C:/Users/thiag/Projetos/Utils/sprites/item_1004_860v2-v2.obd",
  "C:/Users/thiag/Projetos/Utils/sprites/2-outfits/0-geral/0323_kratos_2135_860v2-v2.obd",
];

async function main() {
  for (const file of files) {
    const buf = fs.readFileSync(file);
    const thing = await parseObd(buf);
    const rendered = renderLooktypeFrames(thing);
    console.log("OK", file, thing.category, rendered.length, "frame(s)");
  }
}
main();
