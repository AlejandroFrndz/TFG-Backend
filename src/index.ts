import express, { Application } from "express";
import setUpApp from "src/app/setUpApp";
import { config } from "src/app/config";
import setUpDatabase from "src/app/setUpDatabase";

const app: Application = express();

const startApp = async () => {
    try {
        setUpApp(app);
        await setUpDatabase();
        app.listen(config.port, () =>
            console.log(`App listening on port ${config.port}`)
        );
    } catch (error) {
        console.error(`Error starting the app: ·${error}`);
    }
};

startApp();
