import { config } from "src/app/config";
import {
    EmptyResponse,
    failure,
    FailureOrSuccess,
    success
} from "src/core/logic";
import { NotFoundError, UnexpectedError } from "src/core/logic/errors";
import { getObject, listObjects, uploadBlob } from "src/core/services/AWS/S3";
import { promises as fs } from "fs";
import { _getSearchesProjectFolder } from "#search/services/FileSystem";

const uploadParameterFile = async (
    searchId: string,
    parameter: "noun1" | "verb" | "noun2",
    file: Express.Multer.File
): Promise<EmptyResponse> => {
    try {
        const key = `${searchId}/${parameter}/${file.originalname}`;

        await uploadBlob({
            key,
            bucket: config.AWS.S3.searchParameterFilesBucket,
            blob: file.buffer
        });

        return success(null);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

const getParameterFile = async (
    searchId: string,
    parameter: "noun1" | "verb" | "noun2",
    fileName: string
): Promise<FailureOrSuccess<UnexpectedError, Buffer>> => {
    try {
        const key = `${searchId}/${parameter}/${fileName}`;

        const file = await getObject(
            config.AWS.S3.searchParameterFilesBucket,
            key
        );

        return success(file);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

const getProcessedCorpus = async (params: {
    userId: string;
    projectId: string;
}): Promise<EmptyResponse> => {
    return success(null);
    /*const { userId, projectId } = params;
    try {
        const listResponse = await listObjects({
            bucket: config.AWS.S3.processedCorpusBucket,
            prefix: `${userId}/${projectId}/`
        });

        const objectList = listResponse.Contents;

        if (!objectList) {
            return failure(
                new NotFoundError("Processed corpus not found in S3")
            );
        }

        // Create project directory in searches (also create index directory for the files that need it)
        try {
            await fs.mkdir(
                `${_getSearchesProjectFolder(
                    projectId
                )}/processed-corpus/index`,
                { recursive: true }
            );
        } catch (error) {
            if ((error as any).code !== "EEXIST") {
                return failure(new UnexpectedError(error));
            }
        }

        for (const object of objectList) {
            const key = object.Key as string;

            // Strip the userId/projectId prefix from filenames (leaving the index folder in those that have it)
            const fileName = key
                .split("/")
                .filter((_str, indx) => indx > 1)
                .join("/");

            // Get the object from S3
            let file: Buffer;

            try {
                file = await getObject(
                    config.AWS.S3.processedCorpusBucket,
                    key as string
                );
            } catch (error) {
                return failure(new UnexpectedError(error));
            }

            // Write the file in the local file system
            try {
                await fs.writeFile(
                    `${_getSearchesProjectFolder(
                        projectId
                    )}/processed-corpus/${fileName}`,
                    file
                );
            } catch (error) {
                return failure(new UnexpectedError(error));
            }
        }

        return success(null);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }*/
};
export const S3SearchService = {
    uploadParameterFile,
    getParameterFile,
    getProcessedCorpus
};
