import { getFilesFromDir } from "#project/services/fileSystem";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream } from "fs";
import path from "path";
import { s3Client } from "./client";

const _uploadDir = async (dir: string, bucketName: string) => {
    const files = (await getFilesFromDir(dir)) as string[];

    const uploads = files.map((filePath) => {
        const command = new PutObjectCommand({
            Key: path.relative(dir, filePath),
            Bucket: bucketName,
            Body: createReadStream(filePath)
        });

        return s3Client.send(command);
    });

    return Promise.all(uploads);
};

const uploadProcessedCorpus = async (userId: string, projectId: string) => {
    await _uploadDir(
        `${process.cwd()}/src/scripts/corpus_processed/${userId}/${projectId}`,
        "processed-corpus"
    );
};

export const S3Service = {
    uploadProcessedCorpus
};
