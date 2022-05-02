import "reflect-metadata";
import dataSource from "src/core/infra/typeORM/dataSource";

const setUpDatabase = async () => {
    await dataSource.initialize();
};

export default setUpDatabase;
