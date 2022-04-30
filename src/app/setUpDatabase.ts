import "reflect-metadata";
import dataSource from "src/core/infra/typeORM/dataSource";
import { config } from "src/app/config";

const setUpDatabase = async () => {
    await dataSource.initialize();
};

export default setUpDatabase;
