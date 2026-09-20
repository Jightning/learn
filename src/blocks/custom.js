/* Per-course block renderers.
 *
 * A course may ship `blocks.js` to register a renderer the built-ins cannot
 * express — ECE 20001's `schematic` is the standing example, since every
 * built-in figure kind is about data and a schematic is about topology and
 * symbols.
 *
 * This is a separate module from ./index.js because the virtual import below
 * is supplied by Vite. It contains blocks.js modules from PUBLIC courses only:
 * user courses are imported as data and must not become build dependencies
 * merely because their source folders happen to sit beside the demo.
 *
 * A course's registration may declare `notes:` and `name:` alongside `render:`,
 * so a bespoke block says how it behaves at reading depth without the engine
 * knowing anything about it.
 */
import { Blocks, U } from "./index.js";
import custom from "virtual:course-blocks";

custom.forEach(m => { if (typeof m.default === "function") m.default(Blocks, U); });
