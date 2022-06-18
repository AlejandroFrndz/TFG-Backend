import {
    GroupedTriples,
    GroupedTriplesFileFormat
} from "#groupedTriples/domain";
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
import fs, { promises as fsPromises } from "fs";

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
    groupedTriples: GroupedTriples[];
    format: GroupedTriplesFileFormat;
    accuracy?: { relevant: number; total: number; percentage: number };
}): Promise<FailureOrSuccess<UnexpectedError, string>> => {
    const { projectId, groupedTriples, format, accuracy } = params;

    const folderName = `${process.cwd()}${
        config.isProdEnv ? "/dist" : ""
    }/src/scripts/groupFrames/${projectId}/download`;

    const fileName = `${folderName}/results.${format}`;

    const fileGroupedTriples = groupedTriples.map((group) =>
        GroupedTriplesFileMapper.toFile(group)
    );

    try {
        await fsPromises.mkdir(folderName, { recursive: true });
    } catch (error) {
        if ((error as any).code !== "EEXIST") {
            return failure(new UnexpectedError(error));
        }
    }

    if (format === "txt") {
        return new Promise((resolve) => {
            try {
                const stream = fs.createWriteStream(fileName, {
                    autoClose: true
                });

                stream.once("error", (error) =>
                    resolve(failure(new UnexpectedError(error)))
                );

                stream.once("finish", () => resolve(success(fileName)));

                stream.once("open", () => {
                    groupedTriples.forEach((group) => {
                        stream.write(
                            `>>> Combination ${group.combinationNum}\n`
                        );
                        stream.write(
                            `  Arg1 (${
                                group.args1.tr
                                    ? group.args1.tr.toUpperCase()
                                    : ""
                            }-${
                                group.args1.sc
                                    ? group.args1.sc.toUpperCase()
                                    : ""
                            }):\n`
                        );
                        stream.write(`    ${group.args1.nouns}\n`);
                        stream.write(
                            `  Verb (${
                                group.verbs.domain
                                    ? group.verbs.domain.toUpperCase()
                                    : ""
                            }):\n`
                        );
                        stream.write(`    ${group.verbs.verbs}\n`);
                        stream.write(
                            `  Arg2 (${
                                group.args2.tr
                                    ? group.args2.tr.toUpperCase()
                                    : ""
                            }-${
                                group.args2.sc
                                    ? group.args2.sc.toUpperCase()
                                    : ""
                            }):\n`
                        );
                        stream.write(`    ${group.args2.nouns}\n\n`);
                    });

                    if (accuracy) {
                        stream.write(
                            `Accuracy of the patterns: ${
                                accuracy.relevant
                            } relevant out of ${
                                accuracy.total
                            } (${accuracy.percentage.toLocaleString("en-US", {
                                maximumFractionDigits: 2,
                                minimumFractionDigits: 2
                            })}%)\n`
                        );
                    }

                    stream.end();
                });
            } catch (err) {
                resolve(failure(new UnexpectedError(err)));
            }
        });
    } else {
        try {
            await writeTsvFile({
                fileName,
                data: fileGroupedTriples,
                csv: format === "csv"
            });

            return success(fileName);
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
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
