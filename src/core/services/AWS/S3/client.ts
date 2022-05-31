import { S3Client } from "@aws-sdk/client-s3";
import { config } from "src/app/config";

export const s3Client = new S3Client({
    region: config.AWS.region,
    credentials: {
        accessKeyId: config.AWS.accessKeyId,
        secretAccessKey: config.AWS.secretAccessKey
    }
});
