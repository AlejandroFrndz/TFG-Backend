import { FileDomainTriple, FileTriple, Triple } from "#triple/domain";
import { Mapper } from "src/core/domain/mapper";
import { TripleEntity } from "./triple.model";

export type ITripleFileMapper = {
    toFile(triple: Triple): FileTriple;
    fromFile(rawTriple: string[]): FileDomainTriple;
};

export const TripleMapper: Mapper<Triple, TripleEntity> = {
    toDomain: (triple) => ({
        id: triple.id,
        fileId: triple.fileId,
        project: triple.project.id,
        noun1: {
            noun: triple.noun1,
            tr: triple.tr1,
            sc: triple.sc1
        },
        verb: {
            verb: triple.verb,
            domain: triple.verbDomain
        },
        noun2: {
            noun: triple.noun2,
            tr: triple.tr2,
            sc: triple.sc2
        },
        frame: triple.frame,
        problem: triple.problem,
        examples: triple.examples,
        pos: triple.pos,
        corpus: triple.corpus,
        occurs: triple.occurs,
        sources: triple.sources,
        pmiCorpus: triple.pmiCorpus,
        diceCorpus: triple.diceCorpus,
        tCorpus: triple.tCorpus
    })
};

export const TripleFileMapper: ITripleFileMapper = {
    toFile: (triple) => ({
        id: triple.fileId.toString(),
        n1: triple.noun1.noun,
        TR1: triple.noun1.tr || "",
        SC1: triple.noun1.sc || "",
        verb: triple.verb.verb,
        Domain: triple.verb.domain || "",
        n2: triple.noun2.noun,
        TR2: triple.noun2.tr || "",
        SC2: triple.noun2.sc || "",
        Frame: triple.frame || "",
        Problem: triple.problem || "",
        examples: triple.examples,
        pos: triple.pos || "",
        corpus: triple.corpus.toString(),
        occurs: triple.occurs,
        sources: triple.sources,
        pmi_corpus: triple.pmiCorpus.toString(),
        dice_corpus: triple.diceCorpus.toString(),
        t_corpus: triple.tCorpus.toString()
    }),
    fromFile: (rawTriple) => ({
        fileId: parseInt(rawTriple[0]),
        noun1: {
            noun: rawTriple[1],
            tr: rawTriple[2] || null,
            sc: rawTriple[3] || null
        },
        verb: {
            verb: rawTriple[4],
            domain: rawTriple[5] || null
        },
        noun2: {
            noun: rawTriple[6],
            tr: rawTriple[7] || null,
            sc: rawTriple[8] || null
        },
        frame: rawTriple[9] || null,
        problem: rawTriple[10] || null,
        examples: rawTriple[11],
        pos: rawTriple[12] || null,
        corpus: parseInt(rawTriple[13]),
        occurs: rawTriple[14],
        sources: rawTriple[15],
        pmiCorpus: parseFloat(rawTriple[16]),
        diceCorpus: parseFloat(rawTriple[17]),
        tCorpus: parseFloat(rawTriple[18])
    })
};
