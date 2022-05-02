export enum Language {
    English = "English",
    Spanish = "Spanish",
    French = "French"
}

export enum ProjectPhase {
    Creation = "Creation",
    Analysis = "Analysis",
    Tagging = "Tagging",
    Visualization = "Visualization"
}

export type Project = {
    id: string;
    owner: string;
    language: Language | null;
    domainName: string | null;
    isUsingSubdomains: boolean;
    phase: ProjectPhase;
};
