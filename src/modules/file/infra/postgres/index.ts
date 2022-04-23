import { FolderEntity } from "#folder/infra/postgres/folder.model";
import { UserEntity } from "#user/infra/postgres/user.model";
import dataSource from "src/core/infra/typeORM/dataSource";
import { FileEntity } from "./file.model";
import { FileMapper } from "./mapper";
import { TypeORMFileRepository } from "./repo";

const repo = dataSource.getRepository(FileEntity);
const folderRepo = dataSource.getRepository(FolderEntity);
const userRepo = dataSource.getRepository(UserEntity);

export const typeORMFileRepository = new TypeORMFileRepository(
    repo,
    FileMapper,
    folderRepo,
    userRepo
);
