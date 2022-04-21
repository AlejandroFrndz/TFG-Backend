import { User } from "#user/domain";
import { Mapper } from "src/core/domain/mapper";
import { UserEntity } from "./user.model";

export const UserMapper: Mapper<User, UserEntity> = {
    toDomain: (user) => ({
        id: user.id,
        username: user.username,
        passwordHash: user.passwordHash,
        email: user.email,
        isEmailVerfied: user.isEmailVerified,
        isAdmin: user.isAdmin,
        code: user.code
    })
};
