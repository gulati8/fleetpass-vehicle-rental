export const prismaExtensions = {
  rejectIfNotFoundByOrg<T extends { organizationId: string }>(
    entity: T | null,
    organizationId: string,
  ) {
    if (!entity || entity.organizationId !== organizationId) {
      return null;
    }
    return entity;
  },
};
