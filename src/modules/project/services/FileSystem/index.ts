import util from "util";
import { promises as fs } from "fs";
import path from "path";
import child_process from "child_process";
import { failure, success } from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import { Language } from "#project/domain";
import { config } from "src/app/config";
import { deleteDir, FileSystemResponse } from "src/core/services/FileSystem";

const execFile = util.promisify(child_process.execFile);

const writeCorpusFiles = async (
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

const executeParseAndIndex = async (
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
        const isProd = config.isProdEnv ? "true" : "false";
        const { stderr, stdout } = await execFile(
            `${process.cwd()}${
                config.isProdEnv ? "/dist" : ""
            }/src/scripts/parse-and-index-corpus.sh`,
            [langCode, userId, projectId, isProd]
        );

        console.log(stdout, stderr);

        return success(null);
    } catch (error) {
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

const executeGroupFrames = async (
    projectId: string,
    txt = false
): Promise<FileSystemResponse> => {
    const isProd = config.isProdEnv ? "true" : "false";

    try {
        const { stderr, stdout } = await execFile(
            `${process.cwd()}${
                config.isProdEnv ? "/dist" : ""
            }/src/scripts/groupFrames/group-frames${txt ? "-download" : ""}.sh`,
            [projectId, isProd]
        );

        console.log(stdout, stderr);

        return success(null);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

export const FileSystemProjectService = {
    writeCorpusFiles,
    executeParseAndIndex,
    deleteProcessedCorpusDir,
    executeGroupFrames
};

export type IFileSystemProjectService = typeof FileSystemProjectService;
