import express, { Application } from "express";
import setUpApp from "src/app/setUpApp";
import { config } from "src/app/config";

const app: Application = express();

try {
    setUpApp(app);
    app.listen(config.port, () =>
        console.log(`App listening on port ${config.port}`)
    );
} catch (error) {
    console.error(`Error starting the app: ·${error}`);
}
