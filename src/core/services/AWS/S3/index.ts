import {
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand
} from "@aws-sdk/client-s3";
import { createReadStream } from "fs";
import path from "path";
import { getFilesFromDir } from "src/core/services/FileSystem";
import type { Readable } from "stream";
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
    blob: string | Buffer | Readable | ReadableStream<any> | Blob | Uint8Array;
}) => {
    const { key, bucket, blob } = params;

    const command = new PutObjectCommand({
        Key: key,
        Bucket: bucket,
        Body: blob
    });

    return s3Client.send(command);
};

export const getObject = (bucket: string, key: string) =>
    new Promise<Buffer>(async (resolve, reject) => {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });

        try {
            const response = await s3Client.send(command);
            // We can safely cast as S3 in node is guaranteed to use Readable, the other types are for browser usage
            const stream = response.Body as Readable;

            const chunks: Buffer[] = [];

            stream.on("data", (chunk) => chunks.push(chunk));
            stream.once("end", () => resolve(Buffer.concat(chunks)));
            stream.once("error", (err) => reject(err));
        } catch (error) {
            return reject(error);
        }
    });

export const listObjects = (params: { bucket: string; prefix: string }) => {
    const { bucket, prefix } = params;

    const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix
    });

    return s3Client.send(command);
};
