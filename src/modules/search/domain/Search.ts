export enum SearchParameterType {
    String = "string",
    File = "file",
    Any = "any"
}

export type SearchParameter = {
    type: SearchParameterType;
    value: string;
};

export type Search = {
    id: string;
    project: string;
    noun1: SearchParameter;
    verb: SearchParameter;
    noun2: SearchParameter;
    isUsingSynt: boolean;
};
