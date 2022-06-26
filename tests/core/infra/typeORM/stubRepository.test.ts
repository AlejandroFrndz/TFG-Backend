import { faker } from "@faker-js/faker";
import _ from "lodash";
import { StubRepository } from "./stubRepository";

describe("Regular Entity", () => {
    type RegularEntity = {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        field1: number;
        field2: string;
        nullableField: null;
    };

    const repo = new StubRepository<RegularEntity>();

    const createRegularEntity = (
        params?: Partial<RegularEntity>
    ): RegularEntity => ({
        id: faker.datatype.uuid(),
        createdAt: faker.datatype.datetime(),
        updatedAt: faker.datatype.datetime(),
        field1: faker.datatype.number(),
        field2: faker.datatype.string(),
        nullableField: null,
        ...params
    });

    afterEach(() => Reflect.set(repo, "data", []));

    describe("create()", () => {
        it("Includes all fields", () => {
            const field1 = faker.datatype.number();
            const field2 = faker.datatype.string();

            const entity = repo.create(createRegularEntity({ field1, field2 }));

            expect(entity.id).toBeTruthy();
            expect(entity.createdAt).toBeTruthy();
            expect(entity.updatedAt).toBeTruthy();
            expect(entity).toMatchObject({
                field1,
                field2,
                nullableField: null
            });
        });

        it("Skips regular fields if not provided", () => {
            const entity = repo.create({});

            expect(entity.id).toBeTruthy();
            expect(entity.createdAt).toBeTruthy();
            expect(entity.updatedAt).toBeTruthy();
            expect(entity.field1).toBeUndefined();
            expect(entity.field2).toBeUndefined();
            expect(entity.nullableField).toBeUndefined();
        });
    });

    describe("save()", () => {
        let createdEntity: RegularEntity;

        beforeEach(() => {
            createdEntity = repo.create(createRegularEntity());
        });

        it("Saves a new entity", async () => {
            const savedEntity = await repo.save(createdEntity);

            const savedData = Reflect.get(repo, "data");

            expect(savedEntity).toEqual(createdEntity);
            expect(savedData).toHaveLength(1);
            expect(savedData).toContainEqual(createdEntity);
        });

        it("Updates an existing entity", async () => {
            await repo.save(createdEntity);

            jest.useFakeTimers();

            //Set timeout to give enough time for the updatedAt difference when tests run fast
            setTimeout(async () => {
                const updatedEntity = await repo.save({
                    ...createdEntity,
                    field1: faker.datatype.number()
                });

                const savedData = Reflect.get(repo, "data");

                expect(updatedEntity.field1).not.toEqual(createdEntity.field1);
                expect(updatedEntity.updatedAt).not.toEqual(
                    createdEntity.updatedAt
                );
                expect(savedData).toHaveLength(1);
                expect(savedData).toContainEqual(updatedEntity);
                jest.useRealTimers();
            }, 100);
        });
    });

    describe("findOne()", () => {
        let correctEntity: RegularEntity;
        let wrongEntity: RegularEntity;

        beforeEach(async () => {
            correctEntity = repo.create(createRegularEntity());

            wrongEntity = repo.create(createRegularEntity());

            Reflect.set(repo, "data", [correctEntity, wrongEntity]);
        });

        it("Finds the correct entity by single field", async () => {
            const foundEntity = await repo.findOne({
                where: { id: correctEntity.id }
            });

            expect(foundEntity).not.toBeNull();
            expect(foundEntity).toEqual(correctEntity);
        });

        it("Finds the correct entity by multiple fields", async () => {
            const foundEntity = await repo.findOne({
                where: {
                    field1: correctEntity.field1,
                    field2: correctEntity.field2
                }
            });

            expect(foundEntity).not.toBeNull();
            expect(foundEntity).toEqual(correctEntity);
        });

        it("Returns null if the entity does not exist", async () => {
            const foundEntity = await repo.findOne({
                where: { id: faker.datatype.uuid() }
            });

            expect(foundEntity).toBeNull();
        });

        it("Returns the first entity if no filter is given", async () => {
            const foundEntity = await repo.findOne({});

            expect(foundEntity).toBe(correctEntity);
        });

        it("Returns null if data array is empty and no filter is given", async () => {
            Reflect.set(repo, "data", []);

            const foundEntity = await repo.findOne({});

            expect(foundEntity).toBeNull();
        });
    });

    describe("find()", () => {
        let firstEntity: RegularEntity;
        let secondEntity: RegularEntity;
        let wrongEntity: RegularEntity;

        let field1: number;
        let field2: string;

        beforeEach(() => {
            field1 = faker.datatype.number();
            field2 = faker.datatype.string();

            firstEntity = createRegularEntity({ field1, field2 });
            secondEntity = createRegularEntity({ field1, field2 });
            wrongEntity = createRegularEntity();

            Reflect.set(repo, "data", [firstEntity, secondEntity, wrongEntity]);
        });

        it("Finds the correct entities by single field", async () => {
            const foundEntities = await repo.find({
                where: { field1 }
            });

            expect(foundEntities).toHaveLength(2);
            expect(foundEntities).toContainEqual(firstEntity);
            expect(foundEntities).toContainEqual(secondEntity);
        });

        it("Finds the correct entities by multiple field", async () => {
            const foundEntities = await repo.find({
                where: { field1, field2 }
            });

            expect(foundEntities).toHaveLength(2);
            expect(foundEntities).toContainEqual(firstEntity);
            expect(foundEntities).toContainEqual(secondEntity);
        });

        it("Returns empty array if no entities match", async () => {
            const foundEntities = await repo.find({
                where: { id: faker.datatype.uuid() }
            });

            expect(foundEntities).toHaveLength(0);
        });

        it("Returns all entities if no filter is provided", async () => {
            const foundEntities = await repo.find({});

            expect(foundEntities).toHaveLength(3);
            expect(foundEntities).toContainEqual(firstEntity);
            expect(foundEntities).toContainEqual(secondEntity);
            expect(foundEntities).toContainEqual(wrongEntity);
        });
    });

    describe("remove()", () => {
        let correctEntity: RegularEntity;
        let wrongEntity: RegularEntity;

        beforeEach(async () => {
            correctEntity = repo.create(createRegularEntity());

            wrongEntity = repo.create(createRegularEntity());

            Reflect.set(repo, "data", [correctEntity, wrongEntity]);
        });

        it("Removes the correct entity", async () => {
            const removedEntity = await repo.remove(correctEntity);

            const data = Reflect.get(repo, "data");

            expect(removedEntity).toEqual(correctEntity);
            expect(data).toHaveLength(1);
            expect(data).not.toContainEqual(correctEntity);
        });
    });

    describe("_clearData()", () => {
        it("Clears the data array", () => {
            Reflect.set(repo, "data", [
                createRegularEntity(),
                createRegularEntity()
            ]);

            repo._clearData();

            const data = Reflect.get(repo, "data");

            expect(data).toHaveLength(0);
        });
    });

    describe("_createAndSave()", () => {
        it("Creates and saves the entity", () => {
            const entity = createRegularEntity();

            const createdAndSavedEntity = repo._createAndSave(entity);

            const data = Reflect.get(repo, "data");

            expect(data).toHaveLength(1);
            expect(data).toContainEqual(createdAndSavedEntity);
            expect(createdAndSavedEntity).toMatchObject(
                _.pick(entity, ["field1", "field2", "nullableField"])
            );
            expect(createdAndSavedEntity).not.toMatchObject(
                _.pick(entity, ["id", "createdAt", "updatedAt"])
            );
        });
    });
});

describe("No Dates Entity", () => {
    type NoDatesEntity = {
        id: string;
        field1: number;
        field2: string;
    };

    const repo = new StubRepository<NoDatesEntity>({
        hasCreatedAt: false,
        hasUpdatedAt: false
    });

    const createNoDatesEntity = (
        params?: Partial<NoDatesEntity>
    ): NoDatesEntity => ({
        id: faker.datatype.uuid(),
        field1: faker.datatype.number(),
        field2: faker.datatype.string(),
        ...params
    });

    afterEach(() => Reflect.set(repo, "data", []));

    describe("create()", () => {
        it("Doesn't include dates in the creation", () => {
            const field1 = faker.datatype.number();
            const field2 = faker.datatype.string();

            const entity = repo.create(createNoDatesEntity({ field1, field2 }));

            expect(entity.id).toBeTruthy();
            //@ts-ignore
            expect(entity.createdAt).toBeUndefined();
            //@ts-ignore
            expect(entity.updatedAt).toBeUndefined();
            expect(entity).toMatchObject({
                field1,
                field2
            });
        });
    });
});

describe("Composed Id Entity", () => {
    type ComposedIdEntity = {
        partialKey1: string;
        partialKey2: string;
        field1: number;
        field2: string;
    };

    const repo = new StubRepository<ComposedIdEntity>({
        idFields: ["partialKey1", "partialKey2"],
        hasCreatedAt: false,
        hasUpdatedAt: false
    });

    const createComposedIdEntity = (
        params?: Partial<ComposedIdEntity>
    ): ComposedIdEntity => ({
        partialKey1: faker.datatype.uuid(),
        partialKey2: faker.datatype.uuid(),
        field1: faker.datatype.number(),
        field2: faker.datatype.string(),
        ...params
    });

    afterEach(() => Reflect.set(repo, "data", []));

    describe("create()", () => {
        it("Doesn't include regular id in the creation", () => {
            const field1 = faker.datatype.number();
            const field2 = faker.datatype.string();
            const partialKey1 = faker.datatype.uuid();
            const partialKey2 = faker.datatype.uuid();

            const entity = repo.create(
                createComposedIdEntity({
                    field1,
                    field2,
                    partialKey1,
                    partialKey2
                })
            );

            const hasId = Reflect.get(repo, "hasId");

            //@ts-ignore
            expect(entity.id).toBeUndefined();
            expect(entity).toMatchObject({
                field1,
                field2,
                partialKey1,
                partialKey2
            });
            expect(hasId).toBe(false);
        });
    });

    describe("save()", () => {
        let createdEntity: ComposedIdEntity;

        beforeEach(() => {
            createdEntity = repo.create(createComposedIdEntity());
        });

        it("Updates an existing entity", async () => {
            await repo.save(createdEntity);

            const updatedEntity = await repo.save({
                ...createdEntity,
                field1: faker.datatype.number()
            });

            const savedData = Reflect.get(repo, "data");

            expect(updatedEntity.field1).not.toEqual(createdEntity.field1);
            expect(savedData).toHaveLength(1);
            expect(savedData).toContainEqual(updatedEntity);
        });
    });

    describe("remove()", () => {
        let correctEntity: ComposedIdEntity;
        let wrongEntity: ComposedIdEntity;

        beforeEach(async () => {
            correctEntity = repo.create(createComposedIdEntity());

            wrongEntity = repo.create(createComposedIdEntity());

            Reflect.set(repo, "data", [correctEntity, wrongEntity]);
        });

        it("Removes the correct entity", async () => {
            const removedEntity = await repo.remove(correctEntity);

            const data = Reflect.get(repo, "data");

            expect(removedEntity).toEqual(correctEntity);
            expect(data).toHaveLength(1);
            expect(data).not.toContainEqual(correctEntity);
        });
    });
});
