import { Search } from "#search/domain";
import { Mapper } from "src/core/domain/mapper";
import { SearchEntity } from "./search.model";

export const SearchMapper: Mapper<Search, SearchEntity> = {
    toDomain: (search) => ({
        id: search.id,
        project: search.project.id,
        noun1Type: search.noun1Type,
        noun1Value: search.noun1Type,
        noun1FileLocation: search.noun1FileLocation,
        verbType: search.verbType,
        verbValue: search.verbValue,
        verbFileLocation: search.verbFileLocation,
        noun2Type: search.noun2Type,
        noun2Value: search.noun2Value,
        noun2FileLocation: search.noun2FileLocation,
        isUsingSynt: search.isUsingSynt
    })
};
