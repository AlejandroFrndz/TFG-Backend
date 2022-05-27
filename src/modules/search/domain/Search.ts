export enum SearchParameterType {
    String = "string",
    File = "file",
    Any = "any"
}

export type DomainSearchParameter = {
    type: SearchParameterType;
    value: string | null;
    fileLocation: string | null;
};

export type Search = {
    id: string;
    project: string;
    noun1: DomainSearchParameter;
    verb: DomainSearchParameter;
    noun2: DomainSearchParameter;
    isUsingSynt: boolean;
};
