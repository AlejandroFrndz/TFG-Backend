import { Request } from "express";

type SingUpParams = {
    username: string;
    password: string;
    email: string;
};

export type ExpressSingUpRequest = Request<{}, {}, SingUpParams>;

type SingInParams = {
    email: string;
    password: string;
};

export type ExpressSignInRequest = Request<{}, {}, SingInParams>;
