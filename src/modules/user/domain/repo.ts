import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { User } from "./User";

export type UserResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    User
>;

export type UsersResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    User[]
>;

export type CreateUserParams = {
    username: string;
    password: string;
    email: string;
    isAdmin: boolean;
};

export interface IUserRepository {
    create(params: CreateUserParams): Promise<UserResponse>;
    findById(id: string): Promise<UserResponse>;
    findByUsername(username: string): Promise<UserResponse>;
    findByEmail(email: string): Promise<UserResponse>;
    update(
        userId: string,
        params: Partial<CreateUserParams>
    ): Promise<UserResponse>;
}
