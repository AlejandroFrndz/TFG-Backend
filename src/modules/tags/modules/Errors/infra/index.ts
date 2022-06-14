import dataSource from "src/core/infra/typeORM/dataSource";
import { ErrorTagEntity } from "./errorTag.model";
import { ErrorTagMapper } from "./mapper";
import { TypeORMErrorTagRepository } from "./repo";

const repo = dataSource.getRepository(ErrorTagEntity);

export const typeORMErrorTagRepository = new TypeORMErrorTagRepository(
    repo,
    ErrorTagMapper
);
