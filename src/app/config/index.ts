import { DataSourceOptions } from "typeorm";

const isDevEnv = process.env.NODE_ENV === "dev";
const isTestEnv = process.env.NODE_ENV === "test";

const isProdEnv = !isDevEnv && !isTestEnv;

if (!isProdEnv) {
    const dotenv = require("dotenv");
    console.log("Loading config from .env");
    dotenv.config({ path: "src/app/config/.env" });
}

export const config = {
    isDevEnv,
    isTestEnv,
    isProdEnv,
    port: process.env.PORT,

    //TypeORM
    typeORM: {
        type: process.env.TYPEORM_CONNECTION,
        host: process.env.RDS_HOSTNAME || process.env.TYPEORM_HOST,
        port: process.env.RDS_PORT || process.env.TYPEORM_PORT,
        username: process.env.RDS_USERNAME || process.env.TYPEORM_USER,
        password: process.env.RDS_PASSWORD || process.env.TYPEORM_PASSWORD,
        database: process.env.RDS_DB_NAME || process.env.TYPEORM_DATABASE,
        entities: [process.env.TYPEORM_ENTITIES],
        migrations: [process.env.TYPEORM_MIGRATIONS],
        migrationsDir: process.env.TYPEORM_MIGRATIONS_DIR,
        migrationsRun: true,
        logging: ["error"]
    } as DataSourceOptions,

    //JWT
    jwtSecret: process.env.JWT_SECRET || "",

    //AWS
    AWS: {
        region: process.env.AWS_REGION || "eu-west-3",
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",

        S3: {
            processedCorpusBucket:
                process.env.AWS_PROCESSED_CORPUS_BUCKET || "",
            searchParameterFilesBucket:
                process.env.AWS_SEARCH_PARAMETER_FILES_BUCKET || "",
            tmpSearchResultsBucket:
                process.env.AWS_TMP_SEARCH_RESULTS_BUCKET || ""
        }
    }
};
