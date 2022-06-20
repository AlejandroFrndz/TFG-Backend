export type Triple = {
    id: string;
    project: string;
    fileId: number;
    noun1: {
        noun: string;
        tr: string | null;
        sc: string | null;
    };
    verb: {
        verb: string;
        domain: string | null;
    };
    noun2: {
        noun: string;
        tr: string | null;
        sc: string | null;
    };
    frame: string | null;
    problem: string | null;
    examples: string;
    pos: string | null;
    corpus: number;
    occurs: string;
    sources: string;
    pmiCorpus: number;
    diceCorpus: number;
    tCorpus: number;
};

export type FileTriple = {
    id: string;
    n1: string;
    TR1: string;
    SC1: string;
    verb: string;
    Domain: string;
    n2: string;
    TR2: string;
    SC2: string;
    Frame: string;
    Problem: string;
    examples: string;
    pos: string;
    corpus: string;
    occurs: string;
    sources: string;
    pmi_corpus: string;
    dice_corpus: string;
    t_corpus: string;
};

export type FileDomainTriple = Omit<Triple, "id" | "project">;
