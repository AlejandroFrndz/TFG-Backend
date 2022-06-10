import { Request } from "express";

export type ExpressCreateLexicalDomainTagRequest = Request<
    {},
    {},
    { tag: string; protoVerbs?: string }
>;
