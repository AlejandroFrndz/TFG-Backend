import fs, { promises as fsPromises } from "fs";
import path from "path";
import { failure, FailureOrSuccess, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import { parse } from "csv-parse";
import { format } from "@fast-csv/format";
import { finished } from "stream/promises";

export type FileSystemResponse = FailureOrSuccess<UnexpectedError, null>;

export const getFilesFromDir = async (
    dir: string
): Promise<string | string[]> => {
    const dirents = await fsPromises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        dirents.map((dirent) => {
            const res = path.resolve(dir, dirent.name);
            return dirent.isDirectory() ? getFilesFromDir(res) : res;
        })
    );

    return Array.prototype.concat(...files);
};

export const deleteDir = async (dir: string): Promise<FileSystemResponse> => {
    try {
        await fsPromises.rm(dir, { recursive: true, force: true });

        return success(null);
    } catch (error) {
        console.log(error);
        return failure(new UnexpectedError(error));
    }
};

export const parseTsvFile = async (fileName: string): Promise<string[][]> => {
    const records: any[] = [];

    const parser = fs
        .createReadStream(fileName)
        .pipe(parse({ delimiter: "\t", escape: false, quote: false }));

    parser.on("readable", () => {
        let record;
        while ((record = parser.read()) !== null) {
            records.push(record);
        }
    });
    parser.once("error", (err) => {
        throw err;
    });

    await finished(parser);
    return records;
};

export const writeTsvFile = async ({
    fileName,
    data,
    includeHeaders = false,
    csv = false
}: {
    fileName: string;
    data: Record<string, string | number | null>[];
    includeHeaders?: boolean;
    csv?: boolean;
}): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (data.length === 0) {
            reject("Empty data");
        }

        const tsvStream = format({ delimiter: `${csv ? "," : "\t"}` });

        const ws = fs.createWriteStream(fileName);

        tsvStream
            .pipe(ws)
            .once("error", (error) => reject(error))
            .once("finish", () => resolve());

        if (includeHeaders) {
            const headers = Object.keys(data[0]);
            tsvStream.write(headers);
        }

        data.forEach((chunk) => tsvStream.write(chunk));

        tsvStream.end();
    });
};
