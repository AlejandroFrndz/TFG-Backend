import { GroupedTriples } from "#groupedTriples/domain";
import { GroupedTriplesFileMapper } from "#groupedTriples/infra/postgres/mapper";
import { config } from "src/app/config";
import { failure, FailureOrSuccess, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import {
    deleteDir,
    FileSystemResponse,
    parseTsvFile,
    writeTsvFile
} from "src/core/services/FileSystem";
import { promises as fs } from "fs";

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

const writeGroupedTriplesFile = async (params: {
    projectId: string;
    triples: GroupedTriples[];
    format: "tsv" | "csv";
}): Promise<FailureOrSuccess<UnexpectedError, string>> => {
    const { projectId, triples, format } = params;

    const folderName = `${process.cwd()}${
        config.isProdEnv ? "/dist" : ""
    }/src/scripts/groupFrames/${projectId}/download`;

    const fileName = `${folderName}/results.${format}`;

    const fileTriples = triples.map((triple) =>
        GroupedTriplesFileMapper.toFile(triple)
    );

    try {
        await fs.mkdir(folderName, { recursive: true });
    } catch (error) {
        if ((error as any).code !== "EEXIST") {
            return failure(new UnexpectedError(error));
        }
    }

    try {
        await writeTsvFile({
            fileName,
            data: fileTriples,
            csv: format === "csv"
        });

        return success(fileName);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

const deleteGroupedTriplesDir = async (
    projectId: string
): Promise<FileSystemResponse> => {
    return deleteDir(
        `${process.cwd()}${
            config.isProdEnv ? "/dist" : ""
        }/src/scripts/groupFrames/${projectId}`
    );
};

export const FileSystemGroupedTriplesService = {
    parseGroupedTriplesFile,
    writeGroupedTriplesFile,
    deleteGroupedTriplesDir
};

export type IFileSystemGroupedTriplesService =
    typeof FileSystemGroupedTriplesService;
