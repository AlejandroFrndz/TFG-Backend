import { LexicalDomainTag } from "#tags/LexicalDomain/domain";
import { Mapper } from "src/core/domain/mapper";
import { LexicalDomainTagEntity } from "./lexicalDomainTag.model";

export const LexicalDomainTagMapper: Mapper<
    LexicalDomainTag,
    LexicalDomainTagEntity
> = {
    toDomain: (tag) => ({
        tag: tag.tag,
        protoVerbs: tag.protoVerbs
    })
};
