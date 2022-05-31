import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream } from "fs";
import path from "path";
import { getFilesFromDir } from "src/core/services/FileSystem";
import internal from "stream";
import { s3Client } from "./client";

export const uploadFile = async (params: {
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

export const uploadDir = async (
    dir: string,
    s3Path: string,
    bucketName: string
) => {
    const files = (await getFilesFromDir(dir)) as string[];

    const uploads = files.map((filePath) =>
        uploadFile({
            key: `${s3Path}/${path.relative(dir, filePath)}`,
            bucket: bucketName,
            fileName: filePath
        })
    );

    return Promise.all(uploads);
};

export const uploadBlob = async (params: {
    key: string;
    bucket: string;
    blob:
        | string
        | Buffer
        | internal.Readable
        | ReadableStream<any>
        | Blob
        | Uint8Array;
}) => {
    const { key, bucket, blob } = params;

    const command = new PutObjectCommand({
        Key: key,
        Bucket: bucket,
        Body: blob
    });

    return s3Client.send(command);
};
