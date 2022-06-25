import { UserMapper } from "#user/infra/postgres/mapper";
import { TypeORMUserRepository } from "#user/infra/postgres/repo";
import { UserEntity } from "#user/infra/postgres/user.model";
import _ from "lodash";
import { UserFactory } from "tests/factories/UserFactory";
import { StubRepository } from "tests/stubRepository";
import { Repository } from "typeorm";
import bcrypt from "bcrypt";

describe("TypeORM User Repository", () => {
    const _stubRepo = new StubRepository<UserEntity>();
    const repo = new TypeORMUserRepository(
        _stubRepo as unknown as Repository<UserEntity>,
        UserMapper
    );

    afterEach(() => {
        _stubRepo._clearData();
    });

    describe("create()", () => {
        it("creates a user", async () => {
            const params = UserFactory.createRequest();

            const userResponse = await repo.create(params);

            const checkPassword = await bcrypt.compare(
                params.password,
                userResponse.value.passwordHash
            );

            expect(userResponse.isSuccess()).toBeTruthy();
            expect(
                _.pick(userResponse.value, ["email", "username", "isAdmin"])
            ).toMatchObject({ ..._.omit(params, ["password"]) });
            expect(checkPassword).toBeTruthy();
        });
    });
});
