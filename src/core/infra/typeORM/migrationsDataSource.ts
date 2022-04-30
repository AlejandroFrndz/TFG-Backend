import { DataSource } from "typeorm";

/*
    This is the data source used to generate migrations via de CLI. 
    The CLI is incapable of loading the contents of the .env file, 
    so we need to create a diferent file where all the options are explicitly included in the code
*/

const migrationsDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "docker",
    password: "docker",
    database: "docker",
    entities: ["src/**/*.model.ts"],
    logging: "all"
});

export default migrationsDataSource;
