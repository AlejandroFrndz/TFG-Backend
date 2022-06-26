import { CreateUserParams, User } from "#user/domain";
import { faker } from "@faker-js/faker";
import { randomAlphaNumericString } from "src/lib/utils/helpers";

const create = (params?: Partial<User>): User => ({
    id: faker.datatype.uuid(),
    username: faker.internet.userName(),
    passwordHash: faker.git.commitSha(),
    email: faker.internet.email(),
    isEmailVerfied: true,
    isAdmin: false,
    code: randomAlphaNumericString(6, "#"),
    ...params
});

const createRequest = (
    params?: Partial<CreateUserParams>
): CreateUserParams => ({
    username: faker.internet.userName(),
    password: faker.internet.password(undefined, true),
    email: faker.internet.email(),
    isAdmin: false,
    ...params
});

export const UserFactory = { create, createRequest };
