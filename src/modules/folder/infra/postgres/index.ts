import dataSource from "src/core/infra/typeORM/dataSource";
import { FolderEntity } from "./folder.model";
import { FolderMapper } from "./mapper";
import { TypeORMFolderRepository } from "./repo";

const repo = dataSource.getRepository(FolderEntity);

export const typeORMFolderRepository = new TypeORMFolderRepository(
    repo,
    FolderMapper
);
