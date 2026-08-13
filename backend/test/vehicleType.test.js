import { describe, it, expect } from "vitest";
import { isValidVehicleType, matchesVehicle } from "../src/domain/vehicleType.js";

describe("isValidVehicleType", () => {
  it("car/bike/bothを許可する", () => {
    expect(isValidVehicleType("car")).toBe(true);
    expect(isValidVehicleType("bike")).toBe(true);
    expect(isValidVehicleType("both")).toBe(true);
  });

  it("不正な値を拒否する", () => {
    expect(isValidVehicleType("boat")).toBe(false);
    expect(isValidVehicleType(undefined)).toBe(false);
  });
});

describe("matchesVehicle", () => {
  it("bothは常に一致する", () => {
    expect(matchesVehicle("both", "car")).toBe(true);
    expect(matchesVehicle("both", "bike")).toBe(true);
  });

  it("同じ移動手段のみ一致する", () => {
    expect(matchesVehicle("car", "car")).toBe(true);
    expect(matchesVehicle("car", "bike")).toBe(false);
    expect(matchesVehicle("bike", "bike")).toBe(true);
    expect(matchesVehicle("bike", "car")).toBe(false);
  });
});
