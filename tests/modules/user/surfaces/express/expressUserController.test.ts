import { File } from "#file/domain";
import { Folder } from "#folder/domain";
import { CreateUserParams, User } from "#user/domain";
import { UserController } from "#user/surfaces/express/controller";
import {
    ExpressAdminDeleteRequest,
    ExpressFindUserByIdRequest,
    ExpressUpdateUserRequest
} from "#user/surfaces/express/types";
import { faker } from "@faker-js/faker";
import { NextFunction, Response, Request } from "express";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";
import { failure } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { StubFileRepository } from "tests/modules/file/domain/stubFileRepo";
import { StubFolderRepository } from "tests/modules/folder/domain/stubFolderRepo";
import { StubUserRepository } from "tests/modules/user/domain/stubUserRepo";
import {
    expectControllerError,
    expectControllerSuccess
} from "tests/testHelpers";
import { UserFactory } from "../../domain/UserFactory";

type StubResponse = Response<
    {
        success: boolean;
        user?: User;
        users?: User[];
        files?: File[];
        folders?: Folder[];
    },
    {
        success: boolean | null;
        user: User | null;
        users: User[] | null;
        files: File[] | null;
        folders: Folder[] | null;
        status: number | null;
        errorType: string;
    }
>;

describe("Express User Controller", () => {
    const userRepo = new StubUserRepository();
    const folderRepo = new StubFolderRepository();
    const fileRepo = new StubFileRepository();

    const controller = UserController(userRepo, folderRepo, fileRepo);

    let res: StubResponse;
    let next: NextFunction;

    beforeEach(() => {
        res = {
            locals: {
                success: null,
                user: null,
                users: null,
                status: null,
                errorType: "",
                files: null,
                folders: null
            },
            status: function (code: number) {
                this.locals.status = code;

                return this;
            },
            json: function (body) {
                this.locals.success = body?.success ?? null;
                this.locals.user = body?.user ?? null;
                this.locals.users = body?.users ?? null;
                this.locals.files = body?.files ?? null;
                this.locals.folders = body?.folders ?? null;

                return this;
            },
            sendStatus: function (code) {
                this.locals.status = code;

                return this;
            }
        } as StubResponse;

        next = (error) => {
            res.locals.errorType = error.type;
            res.locals.success = false;
        };
    });

    describe("findById()", () => {
        let userId: string;
        let req: ExpressFindUserByIdRequest;

        beforeEach(() => {
            userId = faker.datatype.uuid();

            req = { query: { id: userId } } as ExpressFindUserByIdRequest;
        });

        it("Returns the correct user", async () => {
            await controller.findById(req, res, next);

            expectControllerSuccess(res.locals, {
                status: StatusCodes.OK,
                user: { id: userId }
            });
        });

        it("Returns NotFoundError if no user is found", async () => {
            const findByIdSpy = jest
                .spyOn(userRepo, "findById")
                .mockResolvedValue(failure(new NotFoundError("")));

            await controller.findById(req, res, next);

            expectControllerError(res.locals, "NotFoundError");

            findByIdSpy.mockRestore();
        });

        it("Returns UnexpectedError if something goes wrong", async () => {
            const findByIdSpy = jest
                .spyOn(userRepo, "findById")
                .mockResolvedValue(failure(new UnexpectedError()));

            await controller.findById(req, res, next);

            expectControllerError(res.locals, "UnexpectedError");

            findByIdSpy.mockRestore();
        });
    });

    describe("me()", () => {
        let user: User;
        let req: Request;

        beforeEach(() => {
            user = UserFactory.create();

            req = { user } as Request;
        });

        it("Returns user info, files and folders", async () => {
            await controller.me(req, res, next);

            expectControllerSuccess(res.locals, {
                user: _.omit(user, ["passwordHash", "code"]),
                status: StatusCodes.OK
            });

            res.locals.files?.forEach((file) => {
                expect(file.owner).toBe(user.id);
            });
            res.locals.folders?.forEach((folder) => {
                expect(folder.owner).toBe(user.id);
            });
        });

        describe("Returns UnexpectedError when", () => {
            test("Something goes wrong with the folders", async () => {
                const spy = jest
                    .spyOn(folderRepo, "findAllForUser")
                    .mockResolvedValue(failure(new UnexpectedError()));

                await controller.me(req, res, next);

                expectControllerError(res.locals, "UnexpectedError");

                spy.mockRestore();
            });

            test("Something goes wrong with the files", async () => {
                const spy = jest
                    .spyOn(fileRepo, "findAllForUser")
                    .mockResolvedValue(failure(new UnexpectedError()));

                await controller.me(req, res, next);

                expectControllerError(res.locals, "UnexpectedError");

                spy.mockRestore();
            });
        });
    });

    describe("update()", () => {
        let user: User;
        let params: Omit<CreateUserParams, "isAdmin">;
        let req: ExpressUpdateUserRequest;

        beforeEach(() => {
            user = UserFactory.create();
            params = _.omit(UserFactory.createRequest(), ["isAdmin"]);
            req = { user, body: params } as ExpressUpdateUserRequest;
        });

        it("Returns the correct updated user", async () => {
            const usernameSpy = jest
                .spyOn(userRepo, "findByUsername")
                .mockResolvedValue(failure(new NotFoundError("")));
            const emailSpy = jest
                .spyOn(userRepo, "findByEmail")
                .mockResolvedValue(failure(new NotFoundError("")));

            await controller.update(req, res, next);

            expectControllerSuccess(res.locals, {
                user: {
                    ..._.omit(user, ["passwordHash", "code"]),
                    email: params.email,
                    username: params.username
                },
                status: StatusCodes.OK
            });

            usernameSpy.mockRestore();
            emailSpy.mockRestore();
        });

        describe("Returns BadRequestError when", () => {
            test("A user with the requested username already exists", async () => {
                const emailSpy = jest
                    .spyOn(userRepo, "findByEmail")
                    .mockResolvedValue(failure(new NotFoundError("")));

                await controller.update(req, res, next);

                expectControllerError(res.locals, "BadRequestError");

                emailSpy.mockRestore();
            });

            test("A user with the requested email already exists", async () => {
                const usernameSpy = jest
                    .spyOn(userRepo, "findByUsername")
                    .mockResolvedValue(failure(new NotFoundError("")));

                await controller.update(req, res, next);

                expectControllerError(res.locals, "BadRequestError");

                usernameSpy.mockRestore();
            });
        });

        describe("Returns UnexpectedError when", () => {
            test("Something goes wrong checking the username", async () => {
                const usernameSpy = jest
                    .spyOn(userRepo, "findByUsername")
                    .mockResolvedValue(failure(new UnexpectedError()));

                const emailSpy = jest
                    .spyOn(userRepo, "findByEmail")
                    .mockResolvedValue(failure(new NotFoundError("")));

                await controller.update(req, res, next);

                expectControllerError(res.locals, "UnexpectedError");

                usernameSpy.mockRestore();
                emailSpy.mockRestore();
            });

            test("Something goes wrong checking the email", async () => {
                const usernameSpy = jest
                    .spyOn(userRepo, "findByUsername")
                    .mockResolvedValue(failure(new NotFoundError("")));

                const emailSpy = jest
                    .spyOn(userRepo, "findByEmail")
                    .mockResolvedValue(failure(new UnexpectedError()));

                await controller.update(req, res, next);

                expectControllerError(res.locals, "UnexpectedError");

                usernameSpy.mockRestore();
                emailSpy.mockRestore();
            });

            test("Something goes wrong updating the user", async () => {
                const usernameSpy = jest
                    .spyOn(userRepo, "findByUsername")
                    .mockResolvedValue(failure(new NotFoundError("")));

                const emailSpy = jest
                    .spyOn(userRepo, "findByEmail")
                    .mockResolvedValue(failure(new NotFoundError("")));

                const updateSpy = jest
                    .spyOn(userRepo, "update")
                    .mockResolvedValue(failure(new UnexpectedError()));

                await controller.update(req, res, next);

                expectControllerError(res.locals, "UnexpectedError");

                usernameSpy.mockRestore();
                emailSpy.mockRestore();
                updateSpy.mockRestore();
            });
        });
    });

    describe("delete()", () => {
        let user: User;
        let req: Request;

        beforeEach(() => {
            user = UserFactory.create();

            req = { user } as Request;
        });

        it("Deletes the correct user", async () => {
            const spy = jest.spyOn(userRepo, "delete");

            await controller.delete(req, res, next);

            expect(res.locals.status).toBe(StatusCodes.NO_CONTENT);
            expect(spy).toHaveBeenCalledWith(user.id);
        });

        it("Returns UnexpectedError if something goes wrong", async () => {
            const spy = jest
                .spyOn(userRepo, "delete")
                .mockResolvedValue(failure(new UnexpectedError()));

            await controller.delete(req, res, next);

            expectControllerError(res.locals, "UnexpectedError");

            spy.mockRestore();
        });
    });

    describe("adminFindAll()", () => {
        it("Returns all users", async () => {
            await controller.adminFindAll({} as Request, res, next);

            expectControllerSuccess(res.locals, { status: StatusCodes.OK });
        });

        it("Returns UnexpectedError if something goes wrong", async () => {
            const spy = jest
                .spyOn(userRepo, "findAll")
                .mockResolvedValue(failure(new UnexpectedError()));

            await controller.adminFindAll({} as Request, res, next);

            expectControllerError(res.locals, "UnexpectedError");

            spy.mockRestore();
        });
    });

    describe("adminDelete()", () => {
        let userId: string;
        let req: ExpressAdminDeleteRequest;

        beforeEach(() => {
            userId = faker.datatype.uuid();
            req = { params: { userId } } as ExpressAdminDeleteRequest;
        });

        it("Deletes the correct user", async () => {
            const spy = jest.spyOn(userRepo, "delete");

            await controller.adminDelete(req, res, next);

            expect(res.locals.status).toBe(StatusCodes.NO_CONTENT);
            expect(spy).toHaveBeenCalledWith(userId);
        });

        it("Returns UnexpectedError if something goes wrong", async () => {
            const spy = jest
                .spyOn(userRepo, "delete")
                .mockResolvedValue(failure(new UnexpectedError()));

            await controller.adminDelete(req, res, next);

            expectControllerError(res.locals, "UnexpectedError");

            spy.mockRestore();
        });
    });
});
