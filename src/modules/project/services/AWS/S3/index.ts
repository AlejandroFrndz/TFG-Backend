import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream } from "fs";
import { config } from "src/app/config";
import { EmptyResponse, failure, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import { uploadDir } from "src/core/services/AWS/S3";

const uploadProcessedCorpus = async (
    userId: string,
    projectId: string
): Promise<EmptyResponse> => {
    try {
        await uploadDir(
            `${process.cwd()}${
                config.isProdEnv ? "/dist" : ""
            }/src/scripts/corpus_processed/${userId}/${projectId}`,
            `${userId}/${projectId}`,
            config.AWS.S3.processedCorpusBucket
        );
        return success(null);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

export const S3ProjectService = {
    uploadProcessedCorpus
};
