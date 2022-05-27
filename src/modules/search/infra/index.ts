import { ProjectEntity } from "#project/infra/postgres/project.model";
import dataSource from "src/core/infra/typeORM/dataSource";
import { SearchMapper } from "./mapper";
import { TypeORMSearchRepository } from "./repo";
import { SearchEntity } from "./search.model";

const repo = dataSource.getRepository(SearchEntity);
const projectRepo = dataSource.getRepository(ProjectEntity);

export const typeORMSearchRepository = new TypeORMSearchRepository(
    repo,
    SearchMapper,
    projectRepo
);
