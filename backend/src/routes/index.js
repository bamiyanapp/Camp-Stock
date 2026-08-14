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
      handler: async ({ body, user }) => ({
        statusCode: 201,
        body: await itemsService.create(body, user?.userId),
      }),
    },
    {
      method: "PUT",
      path: "/items/{itemId}",
      handler: async ({ params, body, user }) => ({
        statusCode: 200,
        body: await itemsService.update(params.itemId, body, user?.userId),
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
      handler: async ({ user }) => ({
        statusCode: 200,
        body: await campsService.list(user?.userId),
      }),
    },
    {
      method: "POST",
      path: "/camps",
      handler: async ({ body, user }) => {
        const camp = await campsService.create(body, user?.userId);
        await campItemsService.seedAllMatchingItems(camp.campId);
        return { statusCode: 201, body: camp };
      },
    },
    {
      method: "GET",
      path: "/camps/{campId}",
      handler: async ({ params, user }) => ({
        statusCode: 200,
        body: await campsService.get(params.campId, user?.userId),
      }),
    },
    {
      method: "PUT",
      path: "/camps/{campId}",
      handler: async ({ params, body, user }) => ({
        statusCode: 200,
        body: await campsService.update(params.campId, body, user?.userId),
      }),
    },
    {
      method: "DELETE",
      path: "/camps/{campId}",
      handler: async ({ params, user }) => {
        await campsService.remove(params.campId, user?.userId);
        return { statusCode: 204, body: null };
      },
    },

    {
      method: "GET",
      path: "/camps/{campId}/items",
      handler: async ({ params, user }) => ({
        statusCode: 200,
        body: await campItemsService.listForCamp(params.campId, user?.userId),
      }),
    },
    {
      method: "PUT",
      path: "/camps/{campId}/items/{itemId}",
      handler: async ({ params, body, user }) => {
        if (typeof body.used === "boolean") {
          const result = await campItemsService.setUsed(
            params.campId,
            params.itemId,
            body.used,
            user?.userId
          );
          return { statusCode: 200, body: result };
        }
        const result = await campItemsService.setPacked(
          params.campId,
          params.itemId,
          Boolean(body.packed),
          user?.userId
        );
        return { statusCode: 200, body: result };
      },
    },
    {
      method: "DELETE",
      path: "/camps/{campId}/items/{itemId}",
      handler: async ({ params, user }) => {
        await campItemsService.setUsed(params.campId, params.itemId, false, user?.userId);
        return { statusCode: 204, body: null };
      },
    },
  ];
}
