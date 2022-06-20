import { GroupedTriples } from "#groupedTriples/domain";
import { GroupedTriplesFileMapper } from "#groupedTriples/infra/postgres/mapper";
import { config } from "src/app/config";
import { failure, FailureOrSuccess, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import { parseTsvFile } from "src/core/services/FileSystem";

const parseGroupedTriplesFile = async (
    projectId: string
): Promise<FailureOrSuccess<UnexpectedError, GroupedTriples[]>> => {
    const fileName = `${process.cwd()}${
        config.isProdEnv ? "/dist" : ""
    }/src/scripts/groupFrames/${projectId}/results.tsv`;

    try {
        const records = await parseTsvFile(fileName);

        const formattedRecords: GroupedTriples[] = records.map(
            (record, indx) => {
                const fileDomain = GroupedTriplesFileMapper.fromFile(record);

                return { ...fileDomain, combinationNum: indx, projectId };
            }
        );

        return success(formattedRecords);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

export const FileSystemGroupedTriplesService = {
    parseGroupedTriplesFile
};

export type IFileSystemGroupedTriplesService =
    typeof FileSystemGroupedTriplesService;
