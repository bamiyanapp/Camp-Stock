import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const VEHICLE_LABELS = { car: "車", bike: "バイク", both: "共通" };
const FILTER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "car", label: "車のみ" },
  { value: "bike", label: "バイクのみ" },
  { value: "both", label: "共通" },
];
const NEW_CATEGORY_OPTION = "__new__";

function useUniqueCategories(items) {
  return useMemo(
    () => [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "ja")),
    [items]
  );
}

// 持ち物マスタのdefaultUsedForCar/defaultUsedForBikeは、次回以降の同じ移動手段の
// キャンプ作成時に「今回使う」の既定値として引き継がれる実績（issue #221）。
// フィールド未設定（既存データ）は互換のためtrue扱いにする。
function isDefaultUsed(value) {
  return value !== false;
}

function DefaultUsedCheckboxes({ vehicleType, forCar, forBike, onChangeForCar, onChangeForBike }) {
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

function DefaultUsedSummary({ item }) {
  const parts = [];
  if (item.vehicleType === "car" || item.vehicleType === "both") {
    parts.push(`車=${isDefaultUsed(item.defaultUsedForCar) ? "持っていく" : "持っていかない"}`);
  }
  if (item.vehicleType === "bike" || item.vehicleType === "both") {
    parts.push(`バイク=${isDefaultUsed(item.defaultUsedForBike) ? "持っていく" : "持っていかない"}`);
  }
  return <p className="text-xs opacity-60">既定: {parts.join(" / ")}</p>;
}

function CategorySelect({ uniqueCategories, selection, onSelectionChange, newCategory, onNewCategoryChange }) {
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

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [categorySelection, setCategorySelection] = useState(NEW_CATEGORY_OPTION);
  const [newCategory, setNewCategory] = useState("");
  const [vehicleType, setVehicleType] = useState("both");
  const [defaultUsedForCar, setDefaultUsedForCar] = useState(true);
  const [defaultUsedForBike, setDefaultUsedForBike] = useState(true);
  const [filterVehicleType, setFilterVehicleType] = useState("all");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editCategorySelection, setEditCategorySelection] = useState(NEW_CATEGORY_OPTION);
  const [editNewCategory, setEditNewCategory] = useState("");
  const [editVehicleType, setEditVehicleType] = useState("both");
  const [editDefaultUsedForCar, setEditDefaultUsedForCar] = useState(true);
  const [editDefaultUsedForBike, setEditDefaultUsedForBike] = useState(true);

  const uniqueCategories = useUniqueCategories(items);
  const category = categorySelection === NEW_CATEGORY_OPTION ? newCategory : categorySelection;
  const editCategory =
    editCategorySelection === NEW_CATEGORY_OPTION ? editNewCategory : editCategorySelection;

  function reload() {
    setLoading(true);
    api
      .listItems()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleCreate(event) {
    event.preventDefault();
    try {
      await api.createItem({ name, emoji, category, vehicleType, defaultUsedForCar, defaultUsedForBike });
      setName("");
      setEmoji("");
      setCategorySelection(NEW_CATEGORY_OPTION);
      setNewCategory("");
      setDefaultUsedForCar(true);
      setDefaultUsedForBike(true);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(itemId) {
    try {
      await api.deleteItem(itemId);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(item) {
    setEditingItemId(item.itemId);
    setEditName(item.name);
    setEditEmoji(item.emoji || "");
    setEditCategorySelection(item.category);
    setEditNewCategory("");
    setEditVehicleType(item.vehicleType);
    setEditDefaultUsedForCar(isDefaultUsed(item.defaultUsedForCar));
    setEditDefaultUsedForBike(isDefaultUsed(item.defaultUsedForBike));
  }

  function cancelEdit() {
    setEditingItemId(null);
  }

  async function handleUpdate(event, item) {
    event.preventDefault();
    try {
      await api.updateItem(item.itemId, {
        name: editName,
        emoji: editEmoji,
        category: editCategory,
        vehicleType: editVehicleType,
        storageLocation: item.storageLocation,
        notes: item.notes,
        defaultUsedForCar: editDefaultUsedForCar,
        defaultUsedForBike: editDefaultUsedForBike,
      });
      setEditingItemId(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  const visibleItems =
    filterVehicleType === "all"
      ? items
      : items.filter((item) => item.vehicleType === filterVehicleType);

  return (
    <div>
      {error && <p className="mb-4 text-error">{error}</p>}

      <form onSubmit={handleCreate} className="mb-8 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            className="input input-bordered w-16 text-center"
            placeholder="絵文字"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            aria-label="絵文字"
          />
          <input
            className="input input-bordered flex-1"
            placeholder="品名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <CategorySelect
          uniqueCategories={uniqueCategories}
          selection={categorySelection}
          onSelectionChange={setCategorySelection}
          newCategory={newCategory}
          onNewCategoryChange={setNewCategory}
        />
        <select
          className="select select-bordered"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        >
          <option value="both">車・バイク共通</option>
          <option value="car">車のみ</option>
          <option value="bike">バイクのみ</option>
        </select>
        <DefaultUsedCheckboxes
          vehicleType={vehicleType}
          forCar={defaultUsedForCar}
          forBike={defaultUsedForBike}
          onChangeForCar={setDefaultUsedForCar}
          onChangeForBike={setDefaultUsedForBike}
        />
        <button type="submit" className="btn btn-primary">
          持ち物を追加
        </button>
      </form>

      <label className="mb-4 flex items-center gap-2">
        <span className="text-sm opacity-70">区分で絞り込み</span>
        <select
          className="select select-bordered select-sm"
          value={filterVehicleType}
          onChange={(e) => setFilterVehicleType(e.target.value)}
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleItems.map((item) =>
            editingItemId === item.itemId ? (
              <li key={item.itemId} className="card bg-base-200 p-4">
                <form
                  onSubmit={(e) => handleUpdate(e, item)}
                  className="flex flex-col gap-2"
                >
                  <div className="flex gap-2">
                    <input
                      className="input input-bordered w-16 text-center"
                      placeholder="絵文字"
                      value={editEmoji}
                      onChange={(e) => setEditEmoji(e.target.value)}
                      aria-label="絵文字"
                    />
                    <input
                      className="input input-bordered flex-1"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <CategorySelect
                    uniqueCategories={uniqueCategories}
                    selection={editCategorySelection}
                    onSelectionChange={setEditCategorySelection}
                    newCategory={editNewCategory}
                    onNewCategoryChange={setEditNewCategory}
                  />
                  <select
                    className="select select-bordered"
                    value={editVehicleType}
                    onChange={(e) => setEditVehicleType(e.target.value)}
                  >
                    <option value="both">車・バイク共通</option>
                    <option value="car">車のみ</option>
                    <option value="bike">バイクのみ</option>
                  </select>
                  <DefaultUsedCheckboxes
                    vehicleType={editVehicleType}
                    forCar={editDefaultUsedForCar}
                    forBike={editDefaultUsedForBike}
                    onChangeForCar={setEditDefaultUsedForCar}
                    onChangeForBike={setEditDefaultUsedForBike}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-sm btn-primary">
                      保存
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={cancelEdit}
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </li>
            ) : (
              <li
                key={item.itemId}
                className="card flex-row items-center justify-between bg-base-200 p-4"
              >
                <div>
                  <span className="badge badge-outline mr-2">{item.category}</span>
                  {item.emoji && <span className="mr-1">{item.emoji}</span>}
                  {item.name}
                  <span className="badge badge-ghost ml-2">
                    {VEHICLE_LABELS[item.vehicleType]}
                  </span>
                  <DefaultUsedSummary item={item} />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => startEdit(item)}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleDelete(item.itemId)}
                  >
                    削除
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
