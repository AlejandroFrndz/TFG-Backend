import express, { Application } from "express";

const setUpApp = (app: Application) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
};

export default setUpApp;
