import express, { Application } from "express";

const startApp = (app: Application) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
};

export default startApp;
