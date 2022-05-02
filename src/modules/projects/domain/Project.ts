export enum Language {
    English = "English",
    Spanish = "Spanish",
    French = "French"
}

export type Project = {
    id: string;
    owner: string;
    language: Language | null;
    domainName: string | null;
    isUsingSubdomains: boolean;
};
