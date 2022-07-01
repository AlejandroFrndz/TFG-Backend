/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("../../tsconfig.json");

module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: "../../",
    moduleNameMapper: {
        ...pathsToModuleNameMapper(
            {
                ...compilerOptions.paths,
                "src/*": ["./src/*"],
                "tests/*": ["./tests/*"]
            },
            {
                prefix: "<rootDir>/tests/../"
            }
        )
    }
};
