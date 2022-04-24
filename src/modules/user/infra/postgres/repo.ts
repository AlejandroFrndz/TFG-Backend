import {
    CreateUserParams,
    IUserRepository,
    User,
    UserResponse
} from "#user/domain";
import { Repository } from "typeorm";
import { UserEntity } from "./user.model";
import bcrypt from "bcrypt";
import { EmptyResponse, failure, success } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { randomAlphaNumericString } from "src/lib/utils/helpers";
import { Mapper } from "src/core/domain/mapper";

export class TypeORMUserRepository implements IUserRepository {
    constructor(
        private readonly repo: Repository<UserEntity>,
        private readonly mapper: Mapper<User, UserEntity>
    ) {}

    async create(params: CreateUserParams): Promise<UserResponse> {
        try {
            const { password, ...createParams } = params;
            const passwordHash = await bcrypt.hash(password, 10);
            const code = randomAlphaNumericString(6, "#");
            const user = this.repo.create({
                ...createParams,
                passwordHash,
                code
            });

            const createdUser = await this.repo.save(user);

            return success(this.mapper.toDomain(createdUser));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async findById(id: string): Promise<UserResponse> {
        try {
            const user = await this.repo.findOne({ where: { id } });

            if (!user) {
                return failure(
                    new NotFoundError(`User with id ${id} not found`)
                );
            }

            return success(this.mapper.toDomain(user));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async findByEmail(email: string): Promise<UserResponse> {
        try {
            const user = await this.repo.findOne({ where: { email } });

            if (!user) {
                return failure(
                    new NotFoundError(`User with email ${email} not found`)
                );
            }

            return success(this.mapper.toDomain(user));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async findByUsername(username: string): Promise<UserResponse> {
        try {
            const user = await this.repo.findOne({ where: { username } });

            if (!user) {
                return failure(
                    new NotFoundError(
                        `User with username ${username} not found`
                    )
                );
            }

            return success(this.mapper.toDomain(user));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async update(
        userId: string,
        params: Partial<Omit<CreateUserParams, "isAdmin">>
    ): Promise<UserResponse> {
        try {
            const user = await this.repo.findOne({ where: { id: userId } });

            if (!user) {
                return failure(
                    new NotFoundError(`User with id ${userId} not found`)
                );
            }

            const { username, email, password } = params;

            user.username = username ?? user.username;
            user.email = email ?? user.email;

            if (password) {
                const passwordHash = await bcrypt.hash(password, 10);

                user.passwordHash = passwordHash;
            }

            const savedUser = await this.repo.save(user);

            return success(this.mapper.toDomain(savedUser));
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    async delete(userId: string): Promise<EmptyResponse> {
        try {
            const user = await this.repo.findOne({ where: { id: userId } });

            if (!user) {
                return failure(
                    new NotFoundError(`User with id ${userId} not found`)
                );
            }

            await this.repo.remove(user);

            return success(null);
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }
}
