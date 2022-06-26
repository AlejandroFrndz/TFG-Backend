import {
    CreateUserParams,
    IUserRepository,
    UserResponse,
    UsersResponse
} from "#user/domain";
import { UserFactory } from "tests/modules/user/domain/UserFactory";
import bcrypt from "bcrypt";
import { EmptyResponse, success } from "src/core/logic";

export class StubUserRepository implements IUserRepository {
    async create(params: CreateUserParams): Promise<UserResponse> {
        const { password, ...otherParams } = params;

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = UserFactory.create({ ...otherParams, passwordHash });

        return success(newUser);
    }

    async findById(id: string): Promise<UserResponse> {
        const user = UserFactory.create({ id });

        return success(user);
    }

    async findByEmail(email: string): Promise<UserResponse> {
        const user = UserFactory.create({ email });

        return success(user);
    }

    async findByUsername(username: string): Promise<UserResponse> {
        const user = UserFactory.create({ username });

        return success(user);
    }

    async update(
        userId: string,
        params: Partial<CreateUserParams>
    ): Promise<UserResponse> {
        const { password, ...otherParams } = params;
        let passwordHash: string | null = null;

        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        const user = UserFactory.create({
            ...otherParams,
            passwordHash: passwordHash !== null ? passwordHash : undefined,
            id: userId
        });

        return success(user);
    }

    async delete(userId: string): Promise<EmptyResponse> {
        return success(null);
    }

    async findAll(): Promise<UsersResponse> {
        const firstUser = UserFactory.create();
        const secondUser = UserFactory.create();

        return success([firstUser, secondUser]);
    }
}
