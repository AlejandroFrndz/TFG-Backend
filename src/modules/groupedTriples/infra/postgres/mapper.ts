import {
    FileDomainGroupedTriples,
    FileGroupedTriples,
    GroupedTriples
} from "#groupedTriples/domain";
import { Mapper } from "src/core/domain/mapper";
import { GroupedTriplesEntity } from "./groupedTriples.model";

export type IGroupedTriplesFileMapper = {
    toFile(groupedTriples: GroupedTriples): FileGroupedTriples;
    fromFile(rawTriple: string[]): FileDomainGroupedTriples;
};

export const GroupedTriplesMapper: Mapper<
    GroupedTriples,
    GroupedTriplesEntity
> = {
    toDomain: (groupedTriples) => ({
        projectId: groupedTriples.projectId,
        combinationNum: groupedTriples.combinationNum,
        args1: {
            nouns: groupedTriples.args1,
            tr: groupedTriples.tr1,
            sc: groupedTriples.sc1
        },
        verbs: {
            verbs: groupedTriples.verbs,
            domain: groupedTriples.domain
        },
        args2: {
            nouns: groupedTriples.args2,
            tr: groupedTriples.tr2,
            sc: groupedTriples.sc2
        }
    })
};

export const GroupedTriplesFileMapper: IGroupedTriplesFileMapper = {
    toFile: (groupedTriples) => ({
        args1: groupedTriples.args1.nouns,
        tr1: groupedTriples.args1.tr ?? "",
        sc1: groupedTriples.args1.sc ?? "",
        verbs: groupedTriples.verbs.verbs,
        domain: groupedTriples.verbs.domain ?? "",
        args2: groupedTriples.args2.nouns,
        tr2: groupedTriples.args2.tr ?? "",
        sc2: groupedTriples.args2.sc ?? ""
    }),
    fromFile: (rawGroupedTriples) => ({
        args1: {
            nouns: rawGroupedTriples[0],
            tr: rawGroupedTriples[1] === "" ? null : rawGroupedTriples[1],
            sc: rawGroupedTriples[2] === "" ? null : rawGroupedTriples[2]
        },
        verbs: {
            verbs: rawGroupedTriples[3],
            domain: rawGroupedTriples[4] === "" ? null : rawGroupedTriples[4]
        },
        args2: {
            nouns: rawGroupedTriples[5],
            tr: rawGroupedTriples[6] === "" ? null : rawGroupedTriples[6],
            sc: rawGroupedTriples[7] === "" ? null : rawGroupedTriples[7]
        }
    })
};
