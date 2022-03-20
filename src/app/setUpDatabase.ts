import "reflect-metadata";
import { PhotoEntity } from "#photo/infra/postgres/typeORM/photo.model";
import dataSource from "src/core/infra/typeORM/dataSource";
import { config } from "src/app/config";

const setUpDatabase = async () => {
    await dataSource.initialize();

    if (!config.isProdEnv) {
        await dataSource.synchronize();
    }
};

export default setUpDatabase;
