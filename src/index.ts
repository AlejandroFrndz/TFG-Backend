import express, { Application } from "express";
import startApp from "src/app/startApp";
import { config } from "src/app/config";

const app: Application = express();

try {
    startApp(app);
    app.listen(config.port, () =>
        console.log(`App listening on port ${config.port}`)
    );
} catch (error) {
    console.error(`Error starting the app: ·${error}`);
}
