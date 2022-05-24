import { getFilesFromDir } from "#project/services/fileSystem";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream } from "fs";
import path from "path";
import { config } from "src/app/config";
import { EmptyResponse, failure, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import { s3Client } from "./client";

const _uploadFile = async (params: {
    key: string;
    bucket: string;
    fileName: string;
}) => {
    const { key, bucket, fileName } = params;

    const command = new PutObjectCommand({
        Key: key,
        Bucket: bucket,
        Body: createReadStream(fileName)
    });

    return s3Client.send(command);
};

const _uploadDir = async (dir: string, s3Path: string, bucketName: string) => {
    const files = (await getFilesFromDir(dir)) as string[];

    const uploads = files.map((filePath) =>
        _uploadFile({
            key: `${s3Path}/${path.relative(dir, filePath)}`,
            bucket: bucketName,
            fileName: filePath
        })
    );

    return Promise.all(uploads);
};

const uploadProcessedCorpus = async (
    userId: string,
    projectId: string
): Promise<EmptyResponse> => {
    try {
        await _uploadDir(
            `${process.cwd()}/src/scripts/corpus_processed/${userId}/${projectId}`,
            `${userId}/${projectId}`,
            config.AWS.S3.processedCorpusBucket
        );
        return success(null);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

export const S3Service = {
    uploadProcessedCorpus
};
