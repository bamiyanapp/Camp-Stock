import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

const VEHICLE_LABELS = { car: "車", bike: "バイク" };

export default function CampListPage() {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [vehicleType, setVehicleType] = useState("car");

  function reload() {
    setLoading(true);
    api
      .listCamps()
      .then(setCamps)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleCreate(event) {
    event.preventDefault();
    try {
      await api.createCamp({ name, date: date || null, vehicleType });
      setName("");
      setDate("");
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(campId) {
    try {
      await api.deleteCamp(campId);
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
          placeholder="キャンプ名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="input input-bordered"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          className="select select-bordered"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        >
          <option value="car">車</option>
          <option value="bike">バイク</option>
        </select>
        <button type="submit" className="btn btn-primary">
          キャンプを作成
        </button>
      </form>

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {camps.map((camp) => (
            <li key={camp.campId} className="card bg-base-200 p-4">
              <div className="flex items-center justify-between">
                <Link to={`/camps/${camp.campId}`} className="link link-primary">
                  {camp.name}（{VEHICLE_LABELS[camp.vehicleType]}）
                </Link>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => handleDelete(camp.campId)}
                >
                  削除
                </button>
              </div>
              {camp.date && <p className="text-sm opacity-70">{camp.date}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
