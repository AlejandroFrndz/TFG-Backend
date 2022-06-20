import { Search } from "#search/domain";
import { promises as fs } from "fs";
import { config } from "src/app/config";
import {
    EmptyResponse,
    failure,
    FailureOrSuccess,
    success
} from "src/core/logic";
import { UnexpectedError } from "src/core/logic/errors";
import child_process from "child_process";
import util from "util";
import { deleteDir, parseTsvFile } from "src/core/services/FileSystem";
import { FileDomainTriple } from "#triple/domain";
import { TripleFileMapper } from "#triple/infra/mapper";

const execFile = util.promisify(child_process.execFile);

export const _getSearchesProjectFolder = (projectId: string) =>
    `${process.cwd()}${
        config.isProdEnv ? "/dist" : ""
    }/src/scripts/searches/${projectId}`;

const writeParameterFile = async (
    projectId: string,
    searchId: string,
    parameter: "noun1" | "verb" | "noun2",
    file: Buffer
): Promise<EmptyResponse> => {
    try {
        await fs.mkdir(
            `${_getSearchesProjectFolder(
                projectId
            )}/parameterFiles/${searchId}`,
            {
                recursive: true
            }
        );
    } catch (error) {
        if ((error as any).code !== "EEXIST") {
            return failure(new UnexpectedError(error));
        }
    }

    try {
        await fs.writeFile(
            `${_getSearchesProjectFolder(
                projectId
            )}/parameterFiles/${searchId}/${parameter}.txt`,
            file
        );
    } catch (error) {
        return failure(new UnexpectedError(error));
    }

    return success(null);
};

const executeSearchTriples = async (search: Search): Promise<EmptyResponse> => {
    const isProd = config.isProdEnv ? "true" : "false";
    const isSynt = search.isUsingSynt ? "synt" : "";

    const noun1 =
        search.noun1.type === "file"
            ? `${_getSearchesProjectFolder(
                  search.project
              )}/parameterFiles/noun1.txt`
            : search.noun1.value;

    const verb =
        search.verb.type === "file"
            ? `${_getSearchesProjectFolder(
                  search.project
              )}/parameterFiles/verb.txt`
            : search.verb.value;

    const noun2 =
        search.noun2.type === "file"
            ? `${_getSearchesProjectFolder(
                  search.project
              )}/parameterFiles/noun2.txt`
            : search.noun2.value;

    try {
        const { stderr, stdout } = await execFile(
            `${process.cwd()}${
                config.isProdEnv ? "/dist" : ""
            }/src/scripts/searches/search-triples-ex.sh`,
            [noun1, verb, noun2, search.project, search.id, isProd, isSynt]
        );

        console.log(stdout, stderr);

        return success(null);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

const executeGroupTriples = async (
    projectId: string
): Promise<EmptyResponse> => {
    try {
        const { stderr, stdout } = await execFile(
            `${process.cwd()}${
                config.isProdEnv ? "/dist" : ""
            }/src/scripts/searches/group-triples.sh`,
            [_getSearchesProjectFolder(projectId)]
        );

        console.log(stdout, stderr);

        return success(null);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

const parseResultsFile = async (
    projectId: string
): Promise<FailureOrSuccess<UnexpectedError, FileDomainTriple[]>> => {
    const fileName = `${_getSearchesProjectFolder(
        projectId
    )}/combined-searches.tsv`;

    try {
        const records = (await parseTsvFile(fileName)).slice(1);

        if (!records) {
            return success([]);
        }

        const formattedRecords: FileDomainTriple[] = [];

        for (const record of records) {
            const formattedRecord = TripleFileMapper.fromFile(record);

            formattedRecords.push(formattedRecord);
        }

        return success(formattedRecords);
    } catch (error) {
        return failure(new UnexpectedError(error));
    }
};

const deleteSearchesDir = async (projectId: string): Promise<EmptyResponse> => {
    return await deleteDir(`${_getSearchesProjectFolder(projectId)}`);
};

export const FileSystemSearchService = {
    writeParameterFile,
    executeSearchTriples,
    executeGroupTriples,
    deleteSearchesDir,
    parseResultsFile
};

export type IFileSystemSearchService = typeof FileSystemSearchService;
