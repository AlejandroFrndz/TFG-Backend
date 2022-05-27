export enum SearchParameterType {
    String = "string",
    File = "file",
    Any = "any"
}

export type Search = {
    id: string;
    project: string;
    noun1Type: SearchParameterType;
    noun1Value: string | null;
    noun1FileLocation: string | null;
    verbType: SearchParameterType;
    verbValue: string | null;
    verbFileLocation: string | null;
    noun2Type: SearchParameterType;
    noun2Value: string | null;
    noun2FileLocation: string | null;
    isUsingSynt: boolean;
};
