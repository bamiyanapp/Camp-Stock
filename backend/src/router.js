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

// routes: [{ method: "GET", path: "/camps/{campId}", handler: async ({ params, body, query }) => ({ statusCode, body }) }]
// serviceが投げるエラー（ValidationError/NotFoundError、いずれもstatusCodeを持つ）を
// ここでHTTPレスポンスへ変換する。想定外のエラーは500として扱う。
export function createRouter(routes) {
  return {
    async handleRequest({ method, path, body, query }) {
      for (const route of routes) {
        if (route.method !== method) {
          continue;
        }
        const params = matchPath(route.path, path);
        if (params) {
          try {
            return await route.handler({ params, body, query: query || {} });
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
