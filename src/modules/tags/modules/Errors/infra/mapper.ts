import { Mapper } from "src/core/domain/mapper";
import { ErrorTag } from "../domain";
import { ErrorTagEntity } from "./errorTag.model";

export const ErrorTagMapper: Mapper<ErrorTag, ErrorTagEntity> = {
    toDomain: (tag) => ({
        errorCode: tag.errorCode,
        humanReadable: tag.humanReadable
    })
};
