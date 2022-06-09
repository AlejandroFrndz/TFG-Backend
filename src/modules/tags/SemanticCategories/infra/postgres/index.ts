import dataSource from "src/core/infra/typeORM/dataSource";
import { SemanticCategoryTagMapper } from "./mapper";
import { TypeORMSemanticCategoryTagRepository } from "./repo";
import { SemanticCategoryTagEntity } from "./semanticCategoryTag.model";

const repo = dataSource.getRepository(SemanticCategoryTagEntity);

export const typeORMLexicalDomainTagRepository =
    new TypeORMSemanticCategoryTagRepository(repo, SemanticCategoryTagMapper);
