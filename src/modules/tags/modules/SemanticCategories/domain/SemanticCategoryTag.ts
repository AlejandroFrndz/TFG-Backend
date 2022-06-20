export type SemanticCategoryTag = {
    tag: string;
    subTags: SemanticCategoryTag[];
    ancestor: string | null;
};
