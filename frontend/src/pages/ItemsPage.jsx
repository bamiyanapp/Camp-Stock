import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import {
  VEHICLE_LABELS,
  FILTER_OPTIONS,
  NEW_CATEGORY_OPTION,
  useUniqueCategories,
  isDefaultUsed,
  DefaultUsedSummary,
  ItemFormFields,
} from "./ItemsPage.parts.jsx";

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
        <ItemFormFields
          emoji={emoji}
          onEmojiChange={setEmoji}
          name={name}
          onNameChange={setName}
          uniqueCategories={uniqueCategories}
          categorySelection={categorySelection}
          onCategorySelectionChange={setCategorySelection}
          newCategory={newCategory}
          onNewCategoryChange={setNewCategory}
          vehicleType={vehicleType}
          onVehicleTypeChange={setVehicleType}
          defaultUsedForCar={defaultUsedForCar}
          defaultUsedForBike={defaultUsedForBike}
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
                  <ItemFormFields
                    emoji={editEmoji}
                    onEmojiChange={setEditEmoji}
                    name={editName}
                    onNameChange={setEditName}
                    uniqueCategories={uniqueCategories}
                    categorySelection={editCategorySelection}
                    onCategorySelectionChange={setEditCategorySelection}
                    newCategory={editNewCategory}
                    onNewCategoryChange={setEditNewCategory}
                    vehicleType={editVehicleType}
                    onVehicleTypeChange={setEditVehicleType}
                    defaultUsedForCar={editDefaultUsedForCar}
                    defaultUsedForBike={editDefaultUsedForBike}
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
