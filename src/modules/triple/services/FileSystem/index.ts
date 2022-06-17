import { FileTriple } from "#triple/domain";
import { config } from "src/app/config";
import { failure, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import { FileSystemResponse, writeTsvFile } from "src/core/services/FileSystem";
import { promises as fs } from "fs";

const writeTriplesToFile = async (
    projectId: string,
    triples: FileTriple[]
): Promise<FileSystemResponse> => {
    try {
        await fs.mkdir(
            `${process.cwd()}${
                config.isProdEnv ? "/dist" : ""
            }/src/scripts/groupFrames/${projectId}/download`,
            { recursive: true }
        );
    } catch (error) {
        if ((error as any).code !== "EEXIST") {
            return failure(new UnexpectedError(error));
        }
    }

    try {
        await writeTsvFile({
            fileName: `${process.cwd()}${
                config.isProdEnv ? "/dist" : ""
            }/src/scripts/groupFrames/${projectId}/tags.tsv`,
            data: triples,
            includeHeaders: true
        });

        return success(null);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

export const FileSystemTripleService = {
    writeTriplesToFile
};

export type IFileSystemTripleService = typeof FileSystemTripleService;
