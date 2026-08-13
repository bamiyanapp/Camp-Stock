import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isValidVehicleType } from "../src/domain/vehicleType.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("items-seed.json", () => {
  it("各要素が持ち物マスタとして妥当な形式である", async () => {
    const seedPath = join(__dirname, "..", "seed", "items-seed.json");
    const seedItems = JSON.parse(await readFile(seedPath, "utf-8"));

    expect(seedItems.length).toBeGreaterThan(0);

    const itemIds = new Set();
    for (const item of seedItems) {
      expect(typeof item.itemId).toBe("string");
      expect(itemIds.has(item.itemId)).toBe(false);
      itemIds.add(item.itemId);

      expect(typeof item.name).toBe("string");
      expect(item.name.trim().length).toBeGreaterThan(0);

      expect(typeof item.category).toBe("string");
      expect(item.category.trim().length).toBeGreaterThan(0);

      expect(isValidVehicleType(item.vehicleType)).toBe(true);
    }
  });
});
