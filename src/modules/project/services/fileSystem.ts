import util from "util";
import { promises as fs } from "fs";
import path from "path";
import child_process from "child_process";
import { failure, FailureOrSuccess, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import { Language } from "#project/domain";
import { config } from "src/app/config";

const execFile = util.promisify(child_process.execFile);

type FileSystemResponse = FailureOrSuccess<UnexpectedError, null>;

export const writeCorpusFiles = async (
    files: Express.Multer.File[],
    userId: string,
    projectId: string
): Promise<FileSystemResponse> => {
    try {
        await fs.mkdir(
            `${process.cwd()}${
                config.isProdEnv ? "/dist" : ""
            }/src/scripts/corpus_raw/${userId}/${projectId}`,
            { recursive: true }
        );
    } catch (error) {
        if ((error as any).code !== "EEXIST") {
            return failure(new UnexpectedError(error));
        }
    }

    for (const file of files) {
        try {
            const num = (
                await fs.readdir(
                    `${process.cwd()}${
                        config.isProdEnv ? "/dist" : ""
                    }/src/scripts/corpus_raw/${userId}/${projectId}`
                )
            ).length;

            await fs.writeFile(
                `${process.cwd()}${
                    config.isProdEnv ? "/dist" : ""
                }/src/scripts/corpus_raw/${userId}/${projectId}/corpusFile_${num}${path.extname(
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

type LangCode = "EN" | "ES" | "FR";

export const executeParseAndIndex = async (
    language: Language,
    userId: string,
    projectId: string
): Promise<FileSystemResponse> => {
    let langCode: LangCode;

    switch (language) {
        case Language.English:
            langCode = "EN";
            break;
        case Language.Spanish:
            langCode = "ES";
            break;
        case Language.French:
            langCode = "FR";
            break;
    }

    try {
        const { stderr } = await execFile(
            `${process.cwd()}${
                config.isProdEnv ? "/dist" : ""
            }/src/scripts/parse-and-index-corpus.sh`,
            [langCode, userId, projectId]
        );

        console.log(stderr);

        return success(null);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

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

const deleteDir = async (dir: string): Promise<FileSystemResponse> => {
    try {
        await fs.rm(dir, { recursive: true, force: true });

        return success(null);
    } catch (error) {
        console.log(error);
        return failure(new UnexpectedError(error));
    }
};

const deleteProcessedCorpusDir = async (
    userId: string
): Promise<FileSystemResponse> => {
    return deleteDir(
        `${process.cwd()}${
            config.isProdEnv ? "/dist" : ""
        }/src/scripts/corpus_processed/${userId}`
    );
};

export const FileSystemService = {
    writeCorpusFiles,
    executeParseAndIndex,
    getFilesFromDir,
    deleteDir,
    deleteProcessedCorpusDir
};
