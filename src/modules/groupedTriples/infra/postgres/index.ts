import { ProjectEntity } from "#project/infra/postgres/project.model";
import dataSource from "src/core/infra/typeORM/dataSource";
import { GroupedTriplesEntity } from "./groupedTriples.model";
import { GroupedTriplesMapper } from "./mapper";
import { TypeORMGroupedTriplesRepository } from "./repo";

const repo = dataSource.getRepository(GroupedTriplesEntity);
const projectRepo = dataSource.getRepository(ProjectEntity);

export const typeORMGroupedTriplesRepository =
    new TypeORMGroupedTriplesRepository(
        repo,
        GroupedTriplesMapper,
        projectRepo
    );
