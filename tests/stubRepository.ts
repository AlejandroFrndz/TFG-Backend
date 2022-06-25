import {
    DeepPartial,
    FindManyOptions,
    FindOneOptions,
    ObjectLiteral
} from "typeorm";
import { v4 as uuidv4 } from "uuid";

export type StubCreateOptions = {
    hasCreatedAt?: boolean;
    hasUpdatedAt?: boolean;
    idFields?: string[];
};

export class StubRepository<Entity extends ObjectLiteral> {
    private data: Entity[];
    private hasId: boolean;
    private hasCreatedAt: boolean;
    private hasUpdatedAt: boolean;
    private idFields: string[];

    constructor(options?: StubCreateOptions) {
        this.data = [];

        this.hasCreatedAt = options?.hasCreatedAt ?? true;
        this.hasUpdatedAt = options?.hasUpdatedAt ?? true;
        this.idFields = options?.idFields ?? ["id"];
        this.hasId = this.idFields.includes("id");
    }

    create(entityLike: DeepPartial<Entity>): Entity {
        const newEntity: Entity = {} as Entity;

        const entries = Object.entries(entityLike);

        for (const [key, value] of entries) {
            //@ts-ignore
            newEntity[key] = value;
        }

        if (this.hasId) {
            //@ts-ignore
            newEntity.id = uuidv4();
        }

        if (this.hasCreatedAt) {
            //@ts-ignore
            newEntity.createdAt = new Date();
        }

        if (this.hasUpdatedAt) {
            //@ts-ignore
            newEntity.updatedAt = new Date();
        }

        return newEntity;
    }

    async save(newEntity: Entity): Promise<Entity> {
        let alreadyPresent = false;

        this.data = this.data.map((entity) => {
            let idMatch = true;

            this.idFields.forEach((idField) => {
                if (entity[idField] !== newEntity[idField]) {
                    idMatch = false;
                }
            });

            if (!idMatch) {
                return entity;
            } else {
                alreadyPresent = true;
                return {
                    ...newEntity,
                    updatedAt: this.hasUpdatedAt ? new Date() : undefined
                };
            }
        });

        if (!alreadyPresent) this.data = [...this.data, newEntity];

        return newEntity;
    }

    async findOne(options: FindOneOptions<Entity>): Promise<Entity | null> {
        const where = options.where;

        if (!where) {
            return this.data[0] ?? null;
        }

        const filter = Object.entries(where);

        const foundEntity = this.data.find((entity) => {
            for (const [key, value] of filter) {
                if (entity[key] !== value) {
                    return false;
                }
            }

            return true;
        });

        return foundEntity ?? null;
    }

    async find(options: FindManyOptions<Entity>): Promise<Entity[]> {
        const where = options.where;

        if (!where) {
            return this.data;
        }

        const filter = Object.entries(where);

        const foundEntity = this.data.filter((entity) => {
            for (const [key, value] of filter) {
                if (entity[key] !== value) {
                    return false;
                }
            }

            return true;
        });

        return foundEntity;
    }

    async remove(removeEntity: Entity): Promise<Entity> {
        this.data = this.data.filter((entity) => {
            let idMatch = true;

            this.idFields.forEach((idField) => {
                if (entity[idField] !== removeEntity[idField]) {
                    idMatch = false;
                }
            });

            return !idMatch;
        });

        return removeEntity;
    }

    _clearData(): void {
        this.data = [];
    }

    _createAndSave(entityLike: DeepPartial<Entity>): Entity {
        const newEntity = this.create(entityLike);

        this.data = [...this.data, newEntity];

        return newEntity;
    }
}
