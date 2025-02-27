import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createBeaconConfig} from "@lodestar/config";
import {config} from "@lodestar/config/default";
import {WithBytes, phase0, ssz} from "@lodestar/types";
import {describe, expect, it} from "vitest";
import {ZERO_HASH} from "../../../../src/constants/constants.js";
import {verifyBlockSequence} from "../../../../src/sync/backfill/verify.js";
import {BackfillSyncError, BackfillSyncErrorCode} from "./../../../../src/sync/backfill/errors.js";

// Global variable __dirname no longer available in ES6 modules.
// Solutions: https://stackoverflow.com/questions/46745014/alternative-for-dirname-in-node-js-when-using-es6-modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("backfill sync - verify block sequence", () => {
  //mainnet validators root
  const beaconConfig = createBeaconConfig(
    config,
    ssz.Root.fromJson("0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95")
  );

  it("should verify valid chain of blocks", () => {
    const blocks = getBlocks();

    expect(() =>
      verifyBlockSequence(beaconConfig, blocks.slice(0, 2), blocks[2].data.message.parentRoot)
    ).not.toThrow();
  });

  it("should fail with sequence not anchored", () => {
    const blocks = getBlocks();

    const wrongAncorRoot = ssz.Root.defaultValue();
    expect(() => verifyBlockSequence(beaconConfig, blocks, wrongAncorRoot)).toThrow(BackfillSyncErrorCode.NOT_ANCHORED);
  });

  it("should fail with sequence not linear", () => {
    const blocks = getBlocks();
    expect(() => {
      const {error} = verifyBlockSequence(
        beaconConfig,
        // remove middle block
        blocks
          .filter((b) => b.data.message.slot !== 2)
          .slice(0, blocks.length - 2),
        blocks[blocks.length - 1].data.message.parentRoot
      );
      if (error != null) throw new BackfillSyncError({code: error});
    }).toThrow(BackfillSyncErrorCode.NOT_LINEAR);
  });

  //first 4 mainnet blocks
  function getBlocks(): WithBytes<phase0.SignedBeaconBlock>[] {
    const json = JSON.parse(fs.readFileSync(path.join(__dirname, "./blocks.json"), "utf-8")) as unknown[];
    return json.map((b) => {
      return {data: ssz.phase0.SignedBeaconBlock.fromJson(b), bytes: ZERO_HASH};
    });
  }
});
