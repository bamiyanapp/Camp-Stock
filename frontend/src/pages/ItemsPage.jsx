import { useEffect, useState } from "react";
import { api } from "../api/client.js";

const VEHICLE_LABELS = { car: "車", bike: "バイク", both: "共通" };

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [vehicleType, setVehicleType] = useState("both");

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

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
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
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => handleDelete(item.itemId)}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
