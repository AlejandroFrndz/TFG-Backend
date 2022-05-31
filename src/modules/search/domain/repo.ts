import { EmptyResponse, FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { Search, SearchParameter } from "./Search";

export type SearchResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    Search
>;

export type CreateSearchParams = {
    noun1: SearchParameter;
    verb: SearchParameter;
    noun2: SearchParameter;
    isUsingSynt: boolean;
    project: string;
};

export interface ISearchRepository {
    create(params: CreateSearchParams): Promise<SearchResponse>;
    delete(searchId: string): Promise<EmptyResponse>;
    findById(searchId: string): Promise<SearchResponse>;
}
