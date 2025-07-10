import type {
  Session as DatabaseSession,
  User as DatabaseUser
} from "better-auth"
import {betterAuth, generateId} from "better-auth"
import {runAdapterTest} from "better-auth/adapters/test"
import merge from "deepmerge"
import {validate} from "uuid"
import {afterAll, beforeEach, describe, expect, it, suite, test} from "vitest"
import {mikroOrmAdapter} from "../../src/index.js"
import * as betterAuthEntities from "../fixtures/entities/better-auth-entities.js"
import * as entities from "../fixtures/entities/defaults.js"
import {createOrm} from "../fixtures/orm.js"
import {createRandomUsersUtils} from "../fixtures/randomUsers.js"
import type {SessionInput, UserInput} from "../utils/types.js"

const orm = createOrm({entities: Object.values(entities)})
const baOrm = createOrm({
  entities: Object.values(betterAuthEntities)
})
const randomUsers = createRandomUsersUtils(orm)

const adapter = mikroOrmAdapter(orm, {
  debugLogs: {
    isRunningAdapterTests: true
  }
})

suite("better-auth adapter tests", async () => {
  const opts = {
    user: {
      fields: {
        email: "email_address"
      },
      additionalFields: {
        test: {
          type: "string",
          defaultValue: "test"
        }
      }
    },
    session: {
      modelName: "sessions"
    }
  }

  await runAdapterTest({
    getAdapter: async (customOptions = {}) => {
      const merged = merge(opts, customOptions)
      const adapter = mikroOrmAdapter(baOrm, {
        debugLogs: {
          isRunningAdapterTests: true
        }
      })
      return adapter(merged)
    },
    disableTests: {
      // CREATE_MODEL: true,
      // CREATE_MODEL_SHOULD_ALWAYS_RETURN_AN_ID: true,
      // SHOULD_FIND_MANY: true,
      // SHOULD_FIND_MANY_WITH_WHERE: true,
      // SHOULD_FIND_MANY_WITH_OPERATORS: true,
      // SHOULD_FIND_MANY_WITH_SORT_BY: true,
      // SHOULD_FIND_MANY_WITH_LIMIT: true,
      // SHOULD_FIND_MANY_WITH_OFFSET: true,
      // SHOULD_UPDATE_WITH_MULTIPLE_WHERE: true,
      // SHOULD_DELETE_MANY: true,
      // SHOULD_NOT_THROW_ON_DELETE_RECORD_NOT_FOUND: true,
      // SHOULD_NOT_THROW_ON_RECORD_NOT_FOUND: true,
      // SHOULD_FIND_MANY_WITH_CONTAINS_OPERATOR: true,
      // SHOULD_SEARCH_USERS_WITH_STARTS_WITH: true,
      // SHOULD_SEARCH_USERS_WITH_ENDS_WITH: true,
      // SHOULD_PREFER_GENERATE_ID_IF_PROVIDED: true,
      // FIND_MODEL_WITH_SELECT: true,
      // FIND_MODEL_WITH_MODIFIED_FIELD_NAME: true,
      // UPDATE_MODEL: true,
      // FIND_MODEL: true,
      // FIND_MODEL_WITHOUT_ID: true,
      // DELETE_MODEL: true
      // SHOULD_WORK_WITH_REFERENCE_FIELDS: true
    }
  })
})

describe("Adapter Authentication Flow Tests", async () => {
  const testUser = {
    email: "test-email@email.com",
    password: "password",
    name: "Test Name"
  }

  const auth = betterAuth({
    database: adapter,
    emailAndPassword: {
      enabled: true
    }
  })

  afterAll(async () => {
    await orm.getSchemaGenerator().refreshDatabase()
  })

  it("should successfully sign up a new user", async () => {
    const user = await auth.api.signUpEmail({body: testUser})
    expect(user).toBeDefined()
  })

  it("should successfully sign in an existing user", async () => {
    const user = await auth.api.signInEmail({body: testUser})
    expect(user.user).toBeDefined()
  })
})

suite("create", async () => {
  beforeEach(async () => await orm.getSchemaGenerator().refreshDatabase())
  test("a new record", async () => {
    const expected = randomUsers.createOne()
    const actual = await adapter({}).create<UserInput, DatabaseUser>({
      model: "user",
      data: expected
    })

    expect(actual).toMatchObject(expected)
  })

  test("with a reference", async () => {
    const user = await randomUsers.createAndFlushOne()

    const actual = await adapter({}).create<SessionInput, DatabaseSession>({
      model: "session",
      data: {
        token: generateId(),
        userId: user.id,
        expiresAt: new Date()
      }
    })

    expect(actual.userId).toBe(user.id)
  })

  // https://github.com/octet-stream/better-auth-mikro-orm/issues/18
  test("with a reference where the referenced entity is not in the identity map (issue #18)", async () => {
    const user = await randomUsers.createAndFlushOne()
    const userId = user.id

    // clear the identity map, so the referenced
    // user is now not in the identity map
    orm.em.clear()

    const actual = await adapter({}).create<SessionInput, DatabaseSession>({
      model: "session",
      data: {
        token: generateId(),
        userId,
        expiresAt: new Date()
      }
    })

    expect(actual.userId).toBe(userId)
  })

  suite("generateId", () => {
    suite("via database.generateId option", () => {
      test("custom generator", async () => {
        const expected = "451"

        const actual = await adapter({
          advanced: {
            database: {
              generateId: () => expected
            }
          }
        }).create<UserInput, DatabaseUser>({
          model: "user",
          data: randomUsers.createOne()
        })

        expect(actual.id).toBe(expected)
      })

      test("disabled (managed by orm or db)", async () => {
        const actual = await adapter({
          advanced: {
            database: {
              generateId: false
            }
          }
        }).create<UserInput, DatabaseUser>({
          model: "user",
          data: randomUsers.createOne()
        })

        expect(validate(actual.id)).toBe(true)
      })
    })

    suite("via legacy advanced.generateId option", () => {
      test("custom generator", async () => {
        const expected = "451"

        const actual = await adapter({
          advanced: {
            generateId: () => expected
          }
        }).create<UserInput, DatabaseUser>({
          model: "user",
          data: randomUsers.createOne()
        })

        expect(actual.id).toBe(expected)
      })

      test("disabled (managed by orm or db)", async () => {
        const adapter = mikroOrmAdapter(orm, {
          debugLogs: {
            isRunningAdapterTests: true
          }
        })({
          advanced: {
            generateId: false
          }
        })

        const actual = await adapter.create<UserInput, DatabaseUser>({
          model: "user",
          data: randomUsers.createOne()
        })

        expect(validate(actual.id)).toBe(true)
      })
    })
  })
})

suite("count", () => {
  beforeEach(async () => await orm.getSchemaGenerator().refreshDatabase())
  test("returns the number of total rows in the table", async () => {
    const expected = 11

    await randomUsers.createAndFlushMany(expected)

    const actual = await adapter({}).count({model: "user"})

    expect(actual).toBe(expected)
  })

  test("supports where clauses", async () => {
    const [, , user3, , user5] = await randomUsers.createAndFlushMany(10)

    const actual = await adapter({}).count({
      model: "user",
      where: [
        {
          operator: "in",
          field: "id",
          value: [user3.id, user5.id]
        }
      ]
    })

    expect(actual).toBe(2)
  })
})

suite("findOne", () => {
  beforeEach(async () => await orm.getSchemaGenerator().refreshDatabase())
  test("by id", async () => {
    const expected = await randomUsers.createAndFlushOne()
    const actual = await adapter({}).findOne<DatabaseUser>({
      model: "user",
      where: [
        {
          field: "id",
          value: expected.id
        }
      ]
    })

    expect(actual?.id).toBe(expected.id)
  })

  test("by arbitary field", async () => {
    const expected = await randomUsers.createAndFlushOne()
    const actual = await adapter({}).findOne<DatabaseUser>({
      model: "user",
      where: [
        {
          field: "email",
          value: expected.email
        }
      ]
    })

    expect(actual?.id).toBe(expected.id)
  })

  test("returns only selected fields", async () => {
    const user = await randomUsers.createAndFlushOne()
    const actual = await adapter({}).findOne({
      model: "user",
      where: [
        {
          field: "id",
          value: user.id
        }
      ],
      select: ["email"]
    })

    expect(actual).toEqual({email: user.email})
  })

  test("returns null for nonexistent record", async () => {
    const actual = adapter({}).findOne<DatabaseUser>({
      model: "user",
      where: [
        {
          field: "id",
          value: "test"
        }
      ]
    })

    await expect(actual).resolves.toBeNull()
  })
})

suite("findMany", () => {
  beforeEach(async () => await orm.getSchemaGenerator().refreshDatabase())
  test("returns all records", async () => {
    const users = await randomUsers.createAndFlushMany(10)
    const actual = await adapter({}).findMany<DatabaseUser>({
      model: "user"
    })

    expect(actual.map(({id}) => id)).toEqual(users.map(({id}) => id))
  })

  test("limit", async () => {
    const limit = 6
    const users = await randomUsers.createAndFlushMany(10)

    const expected = users.slice(0, limit).map(({id}) => id)
    const actual = await adapter({}).findMany<DatabaseUser>({
      model: "user",
      limit
    })

    expect(actual.map(({id}) => id)).toEqual(expected)
  })

  test("offset", async () => {
    const offset = 3
    const users = await randomUsers.createAndFlushMany(4)

    const expected = users.slice(offset).map(({id}) => id)
    const actual = await adapter({}).findMany<DatabaseUser>({
      model: "user",
      offset
    })

    expect(actual.map(({id}) => id)).toEqual(expected)
  })

  test("sortBy", async () => {
    const [user1, user2, user3] = await randomUsers.createAndFlushMany(
      3,

      (user, index) => ({
        ...user,
        email: `user-${index + 1}@example.com`
      })
    )

    const actual = await adapter({}).findMany<DatabaseUser>({
      model: "user",
      sortBy: {
        field: "email",
        direction: "desc"
      }
    })

    expect(actual.map(({id}) => id)).toEqual([user3.id, user2.id, user1.id])
  })

  suite("operators", () => {
    test("in", async () => {
      const [user1, , user3] = await randomUsers.createAndFlushMany(3)

      const actual = await adapter({}).findMany<DatabaseUser>({
        model: "user",
        where: [
          {
            field: "id",
            operator: "in",
            value: [user1.id, user3.id]
          }
        ]
      })

      expect(actual.map(({id}) => id)).toEqual([user1.id, user3.id])
    })
  })
})

suite("deleteMany", () => {
  test("deletes multiple rows", async () => {
    const users = await randomUsers.createAndFlushMany(3)
    const ids = users.map(({id}) => id)

    const actual = await adapter({}).deleteMany({
      model: "user",
      where: [
        {
          field: "id",
          operator: "in",
          value: ids
        }
      ]
    })

    expect(actual).toBe(users.length)

    const matchedRowsCountPromise = orm.em.count(entities.User, {
      id: {
        $in: ids
      }
    })

    await expect(matchedRowsCountPromise).resolves.toBe(0)
  })
})

suite("issues", () => {
  suite("deleteMany", () => {
    // https://github.com/octet-stream/better-auth-mikro-orm/issues/15
    test("does not clear IdentityMap (issue #15)", async () => {
      const user = await randomUsers.createAndFlushOne()

      const session = orm.em.create(entities.Session, {
        token: generateId(),
        user,
        expiresAt: new Date()
      })

      await orm.em.flush()

      await adapter({}).deleteMany({
        model: "session",
        where: [
          {
            field: "id",
            value: session.id
          }
        ]
      })

      const promise = adapter({}).create<SessionInput, DatabaseSession>({
        model: "session",
        data: {
          token: generateId(),
          userId: user.id,
          expiresAt: new Date()
        }
      })

      await expect(promise).resolves.not.toThrow()
    })
  })
})
