import { SemanticCategoryTag } from "#tags/SemanticCategories/domain";
import { Mapper } from "src/core/domain/mapper";
import { SemanticCategoryTagEntity } from "./semanticCategoryTag.model";

const toDomain = (tag: SemanticCategoryTagEntity): SemanticCategoryTag => {
    return {
        tag: tag.tag,
        ancestor: tag.ancestor ? tag.ancestor.tag : null,
        subTags: tag.subTags.map((subTag) => toDomain(subTag))
    };
};

export const SemanticCategoryTagMapper: Mapper<
    SemanticCategoryTag,
    SemanticCategoryTagEntity
> = {
    toDomain
};
