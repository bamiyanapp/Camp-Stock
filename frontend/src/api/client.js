const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// api/client.jsはReactに依存しないプレーンなモジュールのため、AuthContextから
// ログイン状態（idToken）をモジュール変数として同期させる方式にする。
let authToken = null;
let onUnauthorized = null;

export function setAuthToken(token) {
  authToken = token;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (response.status === 401) {
    const body = await response.json().catch(() => ({}));
    onUnauthorized?.(body.message || "認証情報が無効です");
    throw new Error("ログインが必要です");
  }
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
