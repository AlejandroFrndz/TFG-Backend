import { Search } from "#search/domain";
import { Mapper } from "src/core/domain/mapper";
import { SearchEntity } from "./search.model";

export const SearchMapper: Mapper<Search, SearchEntity> = {
    toDomain: (search) => ({
        id: search.id,
        project: search.project.id,
        noun1: {
            type: search.noun1Type,
            value: search.noun1Value,
            fileLocation: search.noun1FileLocation
        },
        verb: {
            type: search.verbType,
            value: search.verbValue,
            fileLocation: search.verbFileLocation
        },
        noun2: {
            type: search.noun2Type,
            value: search.noun2Value,
            fileLocation: search.noun2FileLocation
        },
        isUsingSynt: search.isUsingSynt
    })
};
