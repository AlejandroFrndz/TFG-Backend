import { config } from "src/app/config";
import { EmptyResponse, failure, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import { uploadBlob } from "src/core/services/AWS/S3";

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

export const S3SearchService = {
    uploadParameterFile
};
