// このファイルはItemsPage.jsxのmax-lines対応で切り出した内部実装の詰め合わせであり、
// 独立したFast Refresh境界にする意図が無いため、コンポーネント以外もまとめてexportする
/* eslint-disable react-refresh/only-export-components */
import { useMemo } from "react";

export const VEHICLE_LABELS = { car: "車", bike: "バイク", both: "共通" };
export const FILTER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "car", label: "車のみ" },
  { value: "bike", label: "バイクのみ" },
  { value: "both", label: "共通" },
];
export const NEW_CATEGORY_OPTION = "__new__";

export function useUniqueCategories(items) {
  return useMemo(
    () => [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "ja")),
    [items]
  );
}

// 持ち物マスタのdefaultUsedForCar/defaultUsedForBikeは、次回以降の同じ移動手段の
// キャンプ作成時に「今回使う」の既定値として引き継がれる実績（issue #221）。
// フィールド未設定（既存データ）は互換のためtrue扱いにする。
export function isDefaultUsed(value) {
  return value !== false;
}

export function DefaultUsedCheckboxes({ vehicleType, forCar, forBike, onChangeForCar, onChangeForBike }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      {(vehicleType === "car" || vehicleType === "both") && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={forCar}
            onChange={(e) => onChangeForCar(e.target.checked)}
          />
          車で持っていく（既定）
        </label>
      )}
      {(vehicleType === "bike" || vehicleType === "both") && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={forBike}
            onChange={(e) => onChangeForBike(e.target.checked)}
          />
          バイクで持っていく（既定）
        </label>
      )}
    </div>
  );
}

export function DefaultUsedSummary({ item }) {
  const parts = [];
  if (item.vehicleType === "car" || item.vehicleType === "both") {
    parts.push(`車=${isDefaultUsed(item.defaultUsedForCar) ? "持っていく" : "持っていかない"}`);
  }
  if (item.vehicleType === "bike" || item.vehicleType === "both") {
    parts.push(`バイク=${isDefaultUsed(item.defaultUsedForBike) ? "持っていく" : "持っていかない"}`);
  }
  return <p className="text-xs opacity-60">既定: {parts.join(" / ")}</p>;
}

export function CategorySelect({ uniqueCategories, selection, onSelectionChange, newCategory, onNewCategoryChange }) {
  return (
    <>
      <select
        className="select select-bordered"
        value={selection}
        onChange={(e) => onSelectionChange(e.target.value)}
      >
        {uniqueCategories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={NEW_CATEGORY_OPTION}>新しい区分を追加</option>
      </select>
      {selection === NEW_CATEGORY_OPTION && (
        <input
          className="input input-bordered"
          placeholder="ジャンル（例: 調理、住、衣類）"
          value={newCategory}
          onChange={(e) => onNewCategoryChange(e.target.value)}
          required
        />
      )}
    </>
  );
}

// 新規追加フォーム・編集フォームの両方で同じ入力項目一式を使うため共通化する
export function ItemFormFields({
  emoji,
  onEmojiChange,
  name,
  onNameChange,
  uniqueCategories,
  categorySelection,
  onCategorySelectionChange,
  newCategory,
  onNewCategoryChange,
  vehicleType,
  onVehicleTypeChange,
  defaultUsedForCar,
  defaultUsedForBike,
  onChangeForCar,
  onChangeForBike,
}) {
  return (
    <>
      <div className="flex gap-2">
        <input
          className="input input-bordered w-16 text-center"
          placeholder="絵文字"
          value={emoji}
          onChange={(e) => onEmojiChange(e.target.value)}
          aria-label="絵文字"
        />
        <input
          className="input input-bordered flex-1"
          placeholder="品名"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
        />
      </div>
      <CategorySelect
        uniqueCategories={uniqueCategories}
        selection={categorySelection}
        onSelectionChange={onCategorySelectionChange}
        newCategory={newCategory}
        onNewCategoryChange={onNewCategoryChange}
      />
      <select
        className="select select-bordered"
        value={vehicleType}
        onChange={(e) => onVehicleTypeChange(e.target.value)}
      >
        <option value="both">車・バイク共通</option>
        <option value="car">車のみ</option>
        <option value="bike">バイクのみ</option>
      </select>
      <DefaultUsedCheckboxes
        vehicleType={vehicleType}
        forCar={defaultUsedForCar}
        forBike={defaultUsedForBike}
        onChangeForCar={onChangeForCar}
        onChangeForBike={onChangeForBike}
      />
    </>
  );
}
