import dataSource from "src/core/infra/typeORM/dataSource";
import { SemanticRoleTagMapper } from "./mapper";
import { TypeORMSemanticRoleTagRepository } from "./repo";
import { SemanticRoleTagEntity } from "./semanticRoleTag.model";

const repo = dataSource.getRepository(SemanticRoleTagEntity);

export const typeORMSemanticRoleTagRepository =
    new TypeORMSemanticRoleTagRepository(repo, SemanticRoleTagMapper);
