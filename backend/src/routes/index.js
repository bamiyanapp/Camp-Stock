export function buildRoutes({ itemsService, campsService, campItemsService }) {
  return [
    {
      method: "GET",
      path: "/items",
      handler: async () => ({ statusCode: 200, body: await itemsService.list() }),
    },
    {
      method: "POST",
      path: "/items",
      handler: async ({ body }) => ({
        statusCode: 201,
        body: await itemsService.create(body),
      }),
    },
    {
      method: "PUT",
      path: "/items/{itemId}",
      handler: async ({ params, body }) => ({
        statusCode: 200,
        body: await itemsService.update(params.itemId, body),
      }),
    },
    {
      method: "DELETE",
      path: "/items/{itemId}",
      handler: async ({ params }) => {
        await itemsService.remove(params.itemId);
        return { statusCode: 204, body: null };
      },
    },

    {
      method: "GET",
      path: "/camps",
      handler: async () => ({ statusCode: 200, body: await campsService.list() }),
    },
    {
      method: "POST",
      path: "/camps",
      handler: async ({ body }) => ({
        statusCode: 201,
        body: await campsService.create(body),
      }),
    },
    {
      method: "GET",
      path: "/camps/{campId}",
      handler: async ({ params }) => ({
        statusCode: 200,
        body: await campsService.get(params.campId),
      }),
    },
    {
      method: "PUT",
      path: "/camps/{campId}",
      handler: async ({ params, body }) => ({
        statusCode: 200,
        body: await campsService.update(params.campId, body),
      }),
    },
    {
      method: "DELETE",
      path: "/camps/{campId}",
      handler: async ({ params }) => {
        await campsService.remove(params.campId);
        return { statusCode: 204, body: null };
      },
    },

    {
      method: "GET",
      path: "/camps/{campId}/items",
      handler: async ({ params }) => ({
        statusCode: 200,
        body: await campItemsService.listForCamp(params.campId),
      }),
    },
    {
      method: "PUT",
      path: "/camps/{campId}/items/{itemId}",
      handler: async ({ params, body }) => {
        if (typeof body.used === "boolean") {
          const result = await campItemsService.setUsed(
            params.campId,
            params.itemId,
            body.used
          );
          return { statusCode: 200, body: result };
        }
        const result = await campItemsService.setPacked(
          params.campId,
          params.itemId,
          Boolean(body.packed)
        );
        return { statusCode: 200, body: result };
      },
    },
    {
      method: "DELETE",
      path: "/camps/{campId}/items/{itemId}",
      handler: async ({ params }) => {
        await campItemsService.setUsed(params.campId, params.itemId, false);
        return { statusCode: 204, body: null };
      },
    },
  ];
}
