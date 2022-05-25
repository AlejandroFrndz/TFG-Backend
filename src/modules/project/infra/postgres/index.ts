import dataSource from "src/core/infra/typeORM/dataSource";
import { ProjectMapper } from "./mapper";
import { ProjectEntity } from "./project.model";
import { TypeORMProjectRepository } from "./repo";

const repo = dataSource.getRepository(ProjectEntity);

export const typeORMProjectRepository = new TypeORMProjectRepository(
    repo,
    ProjectMapper
);
