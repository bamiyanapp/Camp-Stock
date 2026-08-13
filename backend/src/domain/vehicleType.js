export const VEHICLE_TYPES = ["car", "bike", "both"];

export function isValidVehicleType(value) {
  return VEHICLE_TYPES.includes(value);
}

// 持ち物マスタのvehicleType（car/bike/both）が、キャンプの移動手段（car/bike）で
// 使える候補かどうかを判定する。持ち物側がbothなら常に候補になる。
export function matchesVehicle(itemVehicleType, campVehicleType) {
  return itemVehicleType === "both" || itemVehicleType === campVehicleType;
}
