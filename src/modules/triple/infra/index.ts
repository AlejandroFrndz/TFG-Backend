import { ProjectEntity } from "#project/infra/postgres/project.model";
import dataSource from "src/core/infra/typeORM/dataSource";
import { TripleMapper } from "./mapper";
import { TypeORMTripleRepository } from "./repo";
import { TripleEntity } from "./triple.model";

const repo = dataSource.getRepository(TripleEntity);
const projectRepo = dataSource.getRepository(ProjectEntity);

export const typeORMTripleRepository = new TypeORMTripleRepository(
    repo,
    TripleMapper,
    projectRepo
);
