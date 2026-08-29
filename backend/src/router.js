function matchPath(pattern, path) {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = path.split("/").filter(Boolean);
  if (patternSegments.length !== pathSegments.length) {
    return null;
  }
  const params = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const pathSegment = pathSegments[i];
    if (patternSegment.startsWith("{") && patternSegment.endsWith("}")) {
      params[patternSegment.slice(1, -1)] = decodeURIComponent(pathSegment);
    } else if (patternSegment !== pathSegment) {
      return null;
    }
  }
  return params;
}

// routes: [{ method: "GET", path: "/camps/{campId}", skipAuth: false, handler: async ({ params, body, query, user, headers }) => ({ statusCode, body }) }]
// serviceが投げるエラー（ValidationError/NotFoundError/UnauthorizedError/ForbiddenError、いずれも
// statusCodeを持つ）をここでHTTPレスポンスへ変換する。想定外のエラーは500として扱う。
// authenticateを渡すと、マッチしたルートのハンドラを呼び出す前に必ず認証を行い、
// 失敗時はハンドラを実行せず401を返す（認証をルーティングより手前で一元化する）。
// route.skipAuth: trueのルートは認証を経由せずハンドラを直接呼ぶ（セッション
// トークン発行エンドポイント等、呼び出し側がまだセッショントークンを持たない場合用）。
export function createRouter(routes, { authenticate } = {}) {
  return {
    async handleRequest({ method, path, headers, body, query }) {
      for (const route of routes) {
        if (route.method !== method) {
          continue;
        }
        const params = matchPath(route.path, path);
        if (params) {
          try {
            const user =
              !route.skipAuth && authenticate ? await authenticate(headers || {}) : null;
            return await route.handler({ params, body, query: query || {}, user, headers: headers || {} });
          } catch (error) {
            const statusCode = error.statusCode || 500;
            return { statusCode, body: { message: error.message } };
          }
        }
      }
      return { statusCode: 404, body: { message: `Not Found: ${method} ${path}` } };
    },
  };
}
