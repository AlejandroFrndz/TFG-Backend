import multer from "multer";

const upload = multer();
export const corpusUpload = upload.array("corpusFile");
