import { promises as fs } from "fs";
import path from "path";
import { failure, FailureOrSuccess, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";

export type FileSystemResponse = FailureOrSuccess<UnexpectedError, null>;

export const getFilesFromDir = async (
    dir: string
): Promise<string | string[]> => {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
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
        await fs.rm(dir, { recursive: true, force: true });

        return success(null);
    } catch (error) {
        console.log(error);
        return failure(new UnexpectedError(error));
    }
};
