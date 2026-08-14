import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client.js";

const VEHICLE_LABELS = { car: "車", bike: "バイク" };

function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.category)) {
      groups.set(item.category, []);
    }
    groups.get(item.category).push(item);
  }
  return [...groups.entries()];
}

export default function CampDetailPage() {
  const { campId } = useParams();
  const [camp, setCamp] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function reload() {
    setLoading(true);
    Promise.all([api.getCamp(campId), api.listCampItems(campId)])
      .then(([campResult, itemsResult]) => {
        setCamp(campResult);
        setItems(itemsResult);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, [campId]);

  async function handleToggleUsed(itemId, used) {
    try {
      await api.setCampItemUsed(campId, itemId, used);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTogglePacked(itemId, packed) {
    try {
      await api.setCampItemPacked(campId, itemId, packed);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p>読み込み中...</p>;
  }
  if (error) {
    return <p className="text-error">{error}</p>;
  }
  if (!camp) {
    return null;
  }

  const usedCount = items.filter((item) => item.used).length;
  const packedCount = items.filter((item) => item.packed).length;

  return (
    <div>
      <Link to="/" className="link mb-4 inline-block">
        ← キャンプ一覧へ戻る
      </Link>
      <h2 className="mb-2 text-xl font-bold">
        {camp.name}（{VEHICLE_LABELS[camp.vehicleType]}）
      </h2>
      <p className="mb-6 text-sm opacity-70">
        使用予定 {usedCount}件中 {packedCount}件 積み込み済み
      </p>

      <div className="mb-2 grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3 px-2 text-xs font-semibold opacity-70">
        <span className="text-center">今回使う</span>
        <span>品名</span>
        <span className="text-center">積んだ</span>
      </div>

      {groupByCategory(items).map(([category, categoryItems]) => (
        <section key={category} className="mb-6">
          <h3 className="mb-2 font-semibold">{category}</h3>
          <ul className="flex flex-col gap-1">
            {categoryItems.map((item) => (
              <li
                key={item.itemId}
                className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3 rounded bg-base-200 p-2"
              >
                <input
                  type="checkbox"
                  className="checkbox justify-self-center"
                  checked={item.used}
                  aria-label={`${item.name}を今回使う`}
                  onChange={(e) => handleToggleUsed(item.itemId, e.target.checked)}
                />
                <span>{item.name}</span>
                {item.used ? (
                  <input
                    type="checkbox"
                    className="checkbox justify-self-center"
                    checked={item.packed}
                    aria-label={`${item.name}を積んだ`}
                    onChange={(e) => handleTogglePacked(item.itemId, e.target.checked)}
                  />
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
