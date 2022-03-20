import { config } from "src/app/config";
import { DataSource } from "typeorm";

const dataSource = new DataSource({
    ...config.typeORM
});

export default dataSource;
