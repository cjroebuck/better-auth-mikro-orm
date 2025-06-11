import {
  Collection,
  Embeddable,
  Embedded,
  Entity,
  OneToMany,
  type Opt,
  Property,
  Unique
} from "@mikro-orm/core"
import type {User as DatabaseUser} from "better-auth"

import {Base} from "./Base.js"
import {Session} from "./Session.js"

@Entity()
export class User extends Base implements DatabaseUser {
  @Property({type: "string"})
  @Unique()
  email!: string

  @Property({type: "boolean"})
  emailVerified: Opt<boolean> = false

  @Property({type: "string"})
  name!: string

  @OneToMany(() => Session, "user")
  sessions = new Collection<Session, this>(this)

  @Embedded(() => Address, {object: true})
  address!: Address
}

@Embeddable()
class Address {
  @Property({type: "string"})
  street!: string

  @Property({type: "string"})
  city!: string
}
