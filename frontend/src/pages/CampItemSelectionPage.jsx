import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client.js";

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

export default function CampItemSelectionPage() {
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

  if (loading) {
    return <p>読み込み中...</p>;
  }
  if (error) {
    return <p className="text-error">{error}</p>;
  }
  if (!camp) {
    return null;
  }

  return (
    <div>
      <Link to={`/camps/${campId}`} className="link mb-4 inline-block">
        ← {camp.name}へ戻る
      </Link>
      <h2 className="mb-2 text-xl font-bold">今回使う持ち物を選ぶ</h2>
      <p className="mb-6 text-sm opacity-70">
        チェックした持ち物だけが「{camp.name}」の一覧に表示されます。
      </p>

      {groupByCategory(items).map(([category, categoryItems]) => (
        <section key={category} className="mb-6">
          <h3 className="mb-2 font-semibold">{category}</h3>
          <ul className="flex flex-col gap-1">
            {categoryItems.map((item) => (
              <li
                key={item.itemId}
                className="flex items-center gap-3 rounded bg-base-200 p-2"
              >
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={item.used}
                  aria-label={`${item.name}を今回使う`}
                  onChange={(e) => handleToggleUsed(item.itemId, e.target.checked)}
                />
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
