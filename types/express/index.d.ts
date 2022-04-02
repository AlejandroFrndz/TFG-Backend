import { User } from "#user/domain";
declare global {
    declare namespace Express {
        interface Request {
            user: User | null;
        }
    }
}
