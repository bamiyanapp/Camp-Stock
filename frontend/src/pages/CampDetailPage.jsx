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

  // 「今回使う」持ち物のみをメイン一覧に表示する。今回使うかどうかの選択
  // 自体は、別画面（CampItemSelectionPage）で行う。
  const usedItems = items.filter((item) => item.used);
  const packedCount = usedItems.filter((item) => item.packed).length;

  return (
    <div>
      <Link to="/" className="link mb-4 inline-block">
        ← キャンプ一覧へ戻る
      </Link>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {camp.name}（{VEHICLE_LABELS[camp.vehicleType]}）
        </h2>
        <Link to={`/camps/${campId}/select-items`} className="btn btn-sm btn-primary">
          持ち物を選ぶ
        </Link>
      </div>
      <p className="mb-6 text-sm opacity-70">
        使用予定 {usedItems.length}件中 {packedCount}件 積み込み済み
      </p>

      {usedItems.length === 0 ? (
        <p className="text-sm opacity-70">
          今回使う持ち物がまだ選択されていません。「持ち物を選ぶ」から選択してください。
        </p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between gap-3 px-2 text-xs font-semibold opacity-70">
            <span>品名</span>
            <span>積んだ</span>
          </div>

          {groupByCategory(usedItems).map(([category, categoryItems]) => (
            <section key={category} className="mb-6">
              <h3 className="mb-2 font-semibold">{category}</h3>
              <ul className="flex flex-col gap-1">
                {categoryItems.map((item) => (
                  <li
                    key={item.itemId}
                    className="flex items-center justify-between gap-3 rounded bg-base-200 p-2"
                  >
                    <span>
                      {item.emoji && <span className="mr-1">{item.emoji}</span>}
                      {item.name}
                    </span>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={item.packed}
                      aria-label={`${item.name}を積んだ`}
                      onChange={(e) => handleTogglePacked(item.itemId, e.target.checked)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
