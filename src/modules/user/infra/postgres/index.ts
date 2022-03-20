import dataSource from "src/core/infra/typeORM/dataSource";
import { UserMapper } from "./mapper";
import { TypeORMUserRepository } from "./repo";
import { UserEntity } from "./user.model";

const repo = dataSource.getRepository(UserEntity);

export const typeORMUserRepository = new TypeORMUserRepository(
    repo,
    UserMapper
);
