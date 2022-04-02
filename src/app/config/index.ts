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
        host: process.env.TYPEORM_HOST,
        port: process.env.TYPEORM_PORT,
        username: process.env.TYPEORM_USER,
        password: process.env.TYPEORM_PASSWORD,
        database: process.env.TYPEORM_DATABASE,
        entities: [process.env.TYPEORM_ENTITIES],
        migrations: [process.env.TYPEORM_MIGRATIONS],
        migrationsDir: process.env.TYPEORM_MIGRATIONS_DIR,
        migrationsRun: process.env.TYPEORM_MIGRATIONS_RUN,
        logging: process.env.TYPEORM_LOGGING,
        syncronize: !isProdEnv
    } as DataSourceOptions,

    //JWT
    jwtSecret: process.env.JWT_SECRET || ""
};
