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
    port: process.env.PORT
};
