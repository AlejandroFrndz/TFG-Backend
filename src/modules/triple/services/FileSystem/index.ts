import { Triple, TriplesFileFormat } from "#triple/domain";
import { config } from "src/app/config";
import { failure, FailureOrSuccess, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import { FileSystemResponse, writeTsvFile } from "src/core/services/FileSystem";
import { promises as fs } from "fs";
import { TripleFileMapper } from "#triple/infra/mapper";

const writeTriplesToFile = async (
    projectId: string,
    triples: Triple[]
): Promise<FileSystemResponse> => {
    try {
        await fs.mkdir(
            `${process.cwd()}${
                config.isProdEnv ? "/dist" : ""
            }/src/scripts/groupFrames/${projectId}`,
            { recursive: true }
        );
    } catch (error) {
        if ((error as any).code !== "EEXIST") {
            return failure(new UnexpectedError(error));
        }
    }

    const fileTriples = triples.map((triple) =>
        TripleFileMapper.toFile(triple)
    );

    try {
        await writeTsvFile({
            fileName: `${process.cwd()}${
                config.isProdEnv ? "/dist" : ""
            }/src/scripts/groupFrames/${projectId}/tags.tsv`,
            data: fileTriples,
            includeHeaders: true
        });

        return success(null);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

const writeTriplesToDownloadFile = async (params: {
    projectId: string;
    triples: Triple[];
    format: TriplesFileFormat;
}): Promise<FailureOrSuccess<UnexpectedError, string>> => {
    const { projectId, triples, format } = params;

    const folderName = `${process.cwd()}${
        config.isProdEnv ? "/dist" : ""
    }/src/scripts/groupFrames/${projectId}/download`;

    const fileName = `${folderName}/ungrouped.${format}`;

    try {
        await fs.mkdir(folderName, { recursive: true });
    } catch (error) {
        if ((error as any).code !== "EEXIST") {
            return failure(new UnexpectedError(error));
        }
    }

    const fileTriples = triples.map((triple) =>
        TripleFileMapper.toFile(triple)
    );

    try {
        await writeTsvFile({
            fileName,
            includeHeaders: true,
            csv: format === "csv",
            data: fileTriples
        });

        return success(fileName);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

export const FileSystemTripleService = {
    writeTriplesToFile,
    writeTriplesToDownloadFile
};

export type IFileSystemTripleService = typeof FileSystemTripleService;
