import { CreateUserParams } from "#user/domain";
import { Request } from "express";

export type ExpressCreateUserRequest = Request<{}, {}, CreateUserParams>;

export type ExpressFindUserByIdRequest = Request<{}, {}, {}, { id: string }>;

export type ExpressUpdateUserRequest = Request<
    {},
    {},
    Partial<Omit<CreateUserParams, "isAdmin">>
>;

export type ExpressAdminUpdateUserRequest = Request<
    { userId: string },
    {},
    Partial<CreateUserParams>
>;

export type ExpressAdminDeleteRequest = Request<{ userId: string }>;
