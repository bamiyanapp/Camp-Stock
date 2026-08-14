import { useEffect, useState } from "react";
import { api } from "../api/client.js";

const VEHICLE_LABELS = { car: "車", bike: "バイク", both: "共通" };
const FILTER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "car", label: "車のみ" },
  { value: "bike", label: "バイクのみ" },
  { value: "both", label: "共通" },
];

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [vehicleType, setVehicleType] = useState("both");
  const [filterVehicleType, setFilterVehicleType] = useState("all");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editVehicleType, setEditVehicleType] = useState("both");

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
      await api.createItem({ name, category, vehicleType });
      setName("");
      setCategory("");
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
    setEditCategory(item.category);
    setEditVehicleType(item.vehicleType);
  }

  function cancelEdit() {
    setEditingItemId(null);
  }

  async function handleUpdate(event, item) {
    event.preventDefault();
    try {
      await api.updateItem(item.itemId, {
        name: editName,
        category: editCategory,
        vehicleType: editVehicleType,
        storageLocation: item.storageLocation,
        notes: item.notes,
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
        <input
          className="input input-bordered"
          placeholder="品名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="input input-bordered"
          placeholder="ジャンル（例: 調理、住、衣類）"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
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
                  <input
                    className="input input-bordered"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                  <input
                    className="input input-bordered"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    required
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
                  {item.name}
                  <span className="badge badge-ghost ml-2">
                    {VEHICLE_LABELS[item.vehicleType]}
                  </span>
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
