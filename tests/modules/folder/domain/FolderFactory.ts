import { Folder } from "#folder/domain";
import { faker } from "@faker-js/faker";

const create = (params?: Partial<Folder>): Folder => ({
    id: faker.datatype.uuid(),
    name: faker.internet.domainWord(),
    owner: faker.datatype.uuid(),
    parent: faker.datatype.uuid(),
    ...params
});

export const FolderFactory = { create };
