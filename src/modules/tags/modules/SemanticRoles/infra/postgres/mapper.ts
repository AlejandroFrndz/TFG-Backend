import { SemanticRoleTag } from "#tags/modules/SemanticRoles/domain";
import { Mapper } from "src/core/domain/mapper";
import { SemanticRoleTagEntity } from "./semanticRoleTag.model";

export const SemanticRoleTagMapper: Mapper<
    SemanticRoleTag,
    SemanticRoleTagEntity
> = {
    toDomain: (tag) => ({
        tag: tag.tag,
        definition: tag.definition
    })
};
