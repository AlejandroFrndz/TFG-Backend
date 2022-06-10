import dataSource from "src/core/infra/typeORM/dataSource";
import { LexicalDomainTagEntity } from "./lexicalDomainTag.model";
import { LexicalDomainTagMapper } from "./mapper";
import { TypeORMLexicalDomainTagRepository } from "./repo";

const repo = dataSource.getRepository(LexicalDomainTagEntity);

export const typeORMLexicalDomainTagRepository =
    new TypeORMLexicalDomainTagRepository(repo, LexicalDomainTagMapper);
