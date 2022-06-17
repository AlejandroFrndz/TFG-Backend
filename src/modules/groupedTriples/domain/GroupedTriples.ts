export type GroupedTriples = {
    projectId: string;
    combinationNum: number;
    args1: {
        nouns: string;
        tr: string | null;
        sc: string | null;
    };
    verbs: {
        verbs: string;
        domain: string | null;
    };
    args2: {
        nouns: string;
        tr: string | null;
        sc: string | null;
    };
};

export type FileGroupedTriples = {
    args1: string;
    tr1: string;
    sc1: string;
    verbs: string;
    domain: string;
    args2: string;
    tr2: string;
    sc2: string;
};

export type FileDomainGroupedTriples = {
    args1: {
        nouns: string;
        tr: string | null;
        sc: string | null;
    };
    verbs: {
        verbs: string;
        domain: string | null;
    };
    args2: {
        nouns: string;
        tr: string | null;
        sc: string | null;
    };
};
