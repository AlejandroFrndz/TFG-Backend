import util from "util";
import fs from "fs";
import path from "path";
import { failure, FailureOrSuccess, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";

const mkdir = util.promisify(fs.mkdir);
const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

type FileSystemResponse = FailureOrSuccess<UnexpectedError, null>;

export const writeCorpusFiles = async (
    files: Express.Multer.File[],
    userId: string,
    projectId: string
): Promise<FileSystemResponse> => {
    try {
        await mkdir(`${process.cwd()}/src/uploads/corpus/${userId}`);
    } catch (error) {
        if ((error as any).code !== "EEXIST") {
            return failure(new UnexpectedError(error));
        }
    }

    for (const file of files) {
        try {
            const num = (
                await readdir(`${process.cwd()}/src/uploads/corpus/${userId}`)
            ).length;

            await writeFile(
                `${process.cwd()}/src/uploads/corpus/${userId}/${projectId}_${num}${path.extname(
                    file.originalname
                )}`,
                file.buffer
            );
        } catch (error) {
            return failure(new UnexpectedError(error));
        }
    }

    return success(null);
};
