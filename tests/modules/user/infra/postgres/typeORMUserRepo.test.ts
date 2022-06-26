import { UserMapper } from "#user/infra/postgres/mapper";
import { TypeORMUserRepository } from "#user/infra/postgres/repo";
import { UserEntity } from "#user/infra/postgres/user.model";
import _ from "lodash";
import { UserFactory } from "tests/factories/UserFactory";
import { StubRepository } from "tests/stubRepository";
import { Repository } from "typeorm";
import bcrypt from "bcrypt";
import { User } from "#user/domain";
import { expectFailure, expectSuccess } from "tests/testHelpers";
import { faker } from "@faker-js/faker";

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

            expectSuccess(
                userResponse,
                _.omit(params, ["password"]),
                _.pick(userResponse.value, ["email", "username", "isAdmin"])
            );
            expect(checkPassword).toBeTruthy();
        });

        it("returns UnexpectedError if something goes wrong", async () => {
            const createSpy = jest
                .spyOn(_stubRepo, "save")
                .mockRejectedValue(new Error());

            const params = UserFactory.createRequest();

            const userResponse = await repo.create(params);

            expectFailure(userResponse, "UnexpectedError");
            createSpy.mockRestore();
        });
    });

    describe("findById()", () => {
        let correctUser: User;
        let wrongUser: User;

        beforeEach(() => {
            correctUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
            wrongUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
        });

        it("Finds the correct user", async () => {
            const userResponse = await repo.findById(correctUser.id);

            expectSuccess(userResponse, correctUser);
        });

        it("Returns NotFoundError if no user is found", async () => {
            const userResponse = await repo.findById(faker.datatype.uuid());

            expectFailure(userResponse, "NotFoundError");
        });

        it("Returns UnexpectedError if something goes wrong", async () => {
            const findOneSpy = jest
                .spyOn(_stubRepo, "findOne")
                .mockRejectedValue(new Error());

            const userResponse = await repo.findById(correctUser.id);

            expectFailure(userResponse, "UnexpectedError");
            findOneSpy.mockRestore();
        });
    });

    describe("findByEmail()", () => {
        let correctUser: User;
        let wrongUser: User;

        beforeEach(() => {
            correctUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
            wrongUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
        });

        it("Finds the correct user", async () => {
            const userResponse = await repo.findByEmail(correctUser.email);

            expectSuccess(userResponse, correctUser);
        });

        it("Returns NotFoundError if no user is found", async () => {
            const userResponse = await repo.findByEmail(faker.internet.email());

            expectFailure(userResponse, "NotFoundError");
        });

        it("Returns UnexpectedError if something goes wrong", async () => {
            const findOneSpy = jest
                .spyOn(_stubRepo, "findOne")
                .mockRejectedValue(new Error());

            const userResponse = await repo.findByEmail(correctUser.email);

            expectFailure(userResponse, "UnexpectedError");
            findOneSpy.mockRestore();
        });
    });

    describe("findByUsername()", () => {
        let correctUser: User;
        let wrongUser: User;

        beforeEach(() => {
            correctUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
            wrongUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
        });

        it("Finds the correct user", async () => {
            const userResponse = await repo.findByUsername(
                correctUser.username
            );

            expectSuccess(userResponse, correctUser);
        });

        it("Returns NotFoundError if no user is found", async () => {
            const userResponse = await repo.findByUsername(
                faker.internet.userName()
            );

            expectFailure(userResponse, "NotFoundError");
        });

        it("Returns UnexpectedError if something goes wrong", async () => {
            const findOneSpy = jest
                .spyOn(_stubRepo, "findOne")
                .mockRejectedValue(new Error());

            const userResponse = await repo.findByUsername(correctUser.email);

            expectFailure(userResponse, "UnexpectedError");
            findOneSpy.mockRestore();
        });
    });

    describe("update()", () => {
        let correctUser: User;
        let wrongUser: User;

        beforeEach(() => {
            correctUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
            wrongUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
        });

        it("Updates the correct user", async () => {
            const newUsername = faker.internet.userName();
            const newEmail = faker.internet.email();

            const updateResponse = await repo.update(correctUser.id, {
                username: newUsername,
                email: newEmail,
                isAdmin: true
            });

            expectSuccess(
                updateResponse,
                { username: newUsername, email: newEmail, isAdmin: true },
                _.pick(updateResponse.value, ["username", "email", "isAdmin"])
            );

            const savedCorrectUser = UserMapper.toDomain(
                Reflect.get(_stubRepo, "data")[0]
            );
            const savedWrongUser = UserMapper.toDomain(
                Reflect.get(_stubRepo, "data")[1]
            );

            expect(savedWrongUser).toEqual(wrongUser);
            expect(savedCorrectUser).not.toEqual(correctUser);
            expect(savedCorrectUser).toEqual(updateResponse.value);
        });

        it("Properly hashes updated password", async () => {
            const newPassword = faker.internet.password(undefined, true);

            const updateResponse = await repo.update(correctUser.id, {
                password: newPassword
            });

            const checkPassword = await bcrypt.compare(
                newPassword,
                updateResponse.value.passwordHash
            );

            expect(checkPassword).toBe(true);
        });

        it("Returns NotFoundError if user is not found", async () => {
            const updateResponse = await repo.update(faker.datatype.uuid(), {
                email: faker.internet.email()
            });

            expectFailure(updateResponse, "NotFoundError");
        });

        it("Returns UnexpectedError if something goes wrong", async () => {
            const createSpy = jest
                .spyOn(_stubRepo, "save")
                .mockRejectedValue(new Error());

            const updateResponse = await repo.update(correctUser.id, {
                email: faker.internet.email()
            });

            expectFailure(updateResponse, "UnexpectedError");

            createSpy.mockRestore();
        });
    });

    describe("delete()", () => {
        let correctUser: User;
        let wrongUser: User;

        beforeEach(() => {
            correctUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
            wrongUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
        });

        it("Deletes the correct user", async () => {
            const deleteResponse = await repo.delete(correctUser.id);

            expectSuccess(deleteResponse, null);

            const savedData = Reflect.get(_stubRepo, "data");

            expect(savedData).toHaveLength(1);
            expect(UserMapper.toDomain(savedData[0])).toEqual(wrongUser);
        });

        it("Returns NotFoundError if no user matches provided id", async () => {
            const deleteResponse = await repo.delete(faker.datatype.uuid());

            expectFailure(deleteResponse, "NotFoundError");
        });

        it("Returns UnexpectedError if something goes wrong", async () => {
            const removeSpy = jest
                .spyOn(_stubRepo, "remove")
                .mockRejectedValue(new Error());

            const deleteResponse = await repo.delete(correctUser.id);

            expectFailure(deleteResponse, "UnexpectedError");
            removeSpy.mockRestore();
        });
    });

    describe("findAll()", () => {
        let firstUser: User;
        let secondUser: User;

        beforeEach(() => {
            firstUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
            secondUser = UserMapper.toDomain(
                _stubRepo._createAndSave(UserFactory.create())
            );
        });

        it("Finds all saved users", async () => {
            const findResponse = await repo.findAll();

            expectSuccess(findResponse, [firstUser, secondUser]);
        });

        it("Returns empty array if no users are found", async () => {
            _stubRepo._clearData();

            const findResponse = await repo.findAll();

            expectSuccess(findResponse, []);
        });

        it("Returns UnexpectedError if something goes wrong", async () => {
            const findSpy = jest
                .spyOn(_stubRepo, "find")
                .mockRejectedValue(new Error());

            const findResponse = await repo.findAll();

            expectFailure(findResponse, "UnexpectedError");

            findSpy.mockRestore();
        });
    });
});
