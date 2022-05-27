import { FailureOrSuccess } from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { Search, SearchParameterType } from "./Search";

export type SearchResponse = FailureOrSuccess<
    NotFoundError | UnexpectedError,
    Search
>;

export type SearchParameter =
    | {
          type: SearchParameterType.File;
          fileLocation: string;
          value: never;
      }
    | {
          type: SearchParameterType.String;
          value: string;
          fileLocation: never;
      }
    | {
          type: SearchParameterType.Any;
          value: "ANY";
          fileLocation: never;
      };

export type CreateSearchParams = {
    noun1: SearchParameter;
    verb: SearchParameter;
    noun2: SearchParameter;
    isUsingSynt: boolean;
    project: string;
};

export interface ISearchRepository {
    create(params: CreateSearchParams): Promise<SearchResponse>;
}
