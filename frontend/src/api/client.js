const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `リクエストに失敗しました: ${response.status}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const api = {
  listItems: () => request("/items"),
  createItem: (item) => request("/items", { method: "POST", body: JSON.stringify(item) }),
  updateItem: (itemId, item) =>
    request(`/items/${itemId}`, { method: "PUT", body: JSON.stringify(item) }),
  deleteItem: (itemId) => request(`/items/${itemId}`, { method: "DELETE" }),

  listCamps: () => request("/camps"),
  createCamp: (camp) => request("/camps", { method: "POST", body: JSON.stringify(camp) }),
  getCamp: (campId) => request(`/camps/${campId}`),
  deleteCamp: (campId) => request(`/camps/${campId}`, { method: "DELETE" }),

  listCampItems: (campId) => request(`/camps/${campId}/items`),
  setCampItemUsed: (campId, itemId, used) =>
    request(`/camps/${campId}/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ used }),
    }),
  setCampItemPacked: (campId, itemId, packed) =>
    request(`/camps/${campId}/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ packed }),
    }),
};
