import { File } from "#file/domain";
import { faker } from "@faker-js/faker";

const create = (params?: Partial<File>): File => ({
    id: faker.datatype.uuid(),
    name: faker.internet.domainWord(),
    owner: faker.datatype.uuid(),
    parent: faker.datatype.uuid(),
    project: faker.datatype.uuid(),
    ...params
});

export const FileFactory = { create };
