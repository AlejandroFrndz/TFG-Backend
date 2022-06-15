import { FileTriple } from "#triple/domain";
import { EmptyResponse, failure, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import { writeTsvFile } from "src/core/services/FileSystem";

const writeTriplesToFile = async (
    projectId: string,
    triples: FileTriple[]
): Promise<EmptyResponse> => {
    try {
        await writeTsvFile({
            fileName: "testRefactored.csv",
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
