import path from "node:path";
import {fileURLToPath} from "node:url";

// Global variable __dirname no longer available in ES6 modules.
// Solutions: https://stackoverflow.com/questions/46745014/alternative-for-dirname-in-node-js-when-using-es6-modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const testCachePath = path.join(__dirname, "../test-cache");
