import { promises as fs } from "fs";
import { config } from "src/app/config";
import { EmptyResponse, failure, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";

export const _getSearchesProjectFolder = (projectId: string) =>
    `${process.cwd()}${
        config.isProdEnv ? "/dist" : ""
    }/src/scripts/searches/${projectId}`;

const writeParameterFile = async (
    projectId: string,
    searchId: string,
    parameter: "noun1" | "verb" | "noun2",
    file: Buffer
): Promise<EmptyResponse> => {
    try {
        await fs.mkdir(
            `${_getSearchesProjectFolder(
                projectId
            )}/parameterFiles/${searchId}`,
            {
                recursive: true
            }
        );
    } catch (error) {
        if ((error as any).code !== "EEXIST") {
            return failure(new UnexpectedError(error));
        }
    }

    try {
        await fs.writeFile(
            `${_getSearchesProjectFolder(
                projectId
            )}/parameterFiles/${searchId}/${parameter}.txt`,
            file
        );
    } catch (error) {
        return failure(new UnexpectedError(error));
    }

    return success(null);
};

export const FileSystemSearchService = {
    writeParameterFile
};
