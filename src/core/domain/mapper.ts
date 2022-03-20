export type Mapper<D, I> = {
    toDomain: (infra: I) => D;
};
