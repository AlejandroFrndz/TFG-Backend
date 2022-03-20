export type User = {
    id: string;
    username: string;
    passwordHash: string;
    email: string;
    isEmailVerfied: boolean;
    isAdmin: boolean;
    code: string;
};
