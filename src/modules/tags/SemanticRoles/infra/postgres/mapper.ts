import { SemanticRolTag } from "#tags/SemanticRoles/domain";
import { Mapper } from "src/core/domain/mapper";
import { SemanticRoleTagEntity } from "./semanticRoleTag.model";

export const SemanticRoleTagMapper: Mapper<
    SemanticRolTag,
    SemanticRoleTagEntity
> = {
    toDomain: (tag) => ({
        tag: tag.tag,
        definition: tag.definition
    })
};
