import multer from "multer";

const upload = multer();

export const searchFilesUpload = upload.fields([
    { name: "noun1File", maxCount: 1 },
    { name: "verbFile", maxCount: 1 },
    { name: "noun2File", maxCount: 1 }
]);
