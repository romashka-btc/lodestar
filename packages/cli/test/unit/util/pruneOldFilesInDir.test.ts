import fs from "node:fs";
import path from "node:path";
import {rimraf} from "rimraf";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {pruneOldFilesInDir} from "../../../src/util/index.js";
import {testFilesDir} from "../../utils.js";

describe("pruneOldFilesInDir", () => {
  const DAYS_TO_MS = 24 * 60 * 60 * 1000;
  const dataDir = path.join(testFilesDir, "prune-old-files-test");
  const newFile = "newFile.txt";
  const oldFile = "oldFile.txt";

  beforeEach(() => {
    fs.mkdirSync(dataDir, {recursive: true});
    createFileWithAge(path.join(dataDir, oldFile), 2);
    createFileWithAge(path.join(dataDir, newFile), 0);
  });

  afterEach(() => {
    rimraf.sync(dataDir);
  });

  it("should delete old files", () => {
    pruneOldFilesInDir(dataDir, DAYS_TO_MS);

    const files = fs.readdirSync(dataDir);
    expect(files).toEqual(expect.not.arrayContaining([oldFile]));
  });

  it("should not delete new files", () => {
    pruneOldFilesInDir(dataDir, DAYS_TO_MS);

    const files = fs.readdirSync(dataDir);
    expect(files).toEqual(expect.arrayContaining([newFile]));
  });

  it("should delete old files in nested directories", () => {
    const nestedDir = path.join(dataDir, "prune-old-files-nested");

    fs.mkdirSync(nestedDir);
    createFileWithAge(path.join(nestedDir, "nestedFile.txt"), 2);

    pruneOldFilesInDir(dataDir, DAYS_TO_MS);

    expect(fs.existsSync(nestedDir)).toBe(false);
  });

  it("should handle empty directories", () => {
    const emptyDir = path.join(dataDir, "prune-old-files-empty");
    fs.mkdirSync(emptyDir, {recursive: true});

    pruneOldFilesInDir(emptyDir, DAYS_TO_MS);

    expect(fs.existsSync(emptyDir)).toBe(false);
  });

  it("should handle missing directories", () => {
    expect(() => pruneOldFilesInDir(path.join(dataDir, "does-not-exist"), DAYS_TO_MS)).not.toThrowError();
  });

  function createFileWithAge(path: string, ageInDays: number): void {
    // Create a new empty file
    fs.closeSync(fs.openSync(path, "w"));

    if (ageInDays > 0) {
      // Alter file's access and modification dates
      fs.utimesSync(path, Date.now() / 1000, (Date.now() - ageInDays * DAYS_TO_MS) / 1000);
    }
  }
});
