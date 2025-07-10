import {
  Collection,
  Embedded,
  Entity,
  OneToMany,
  type Opt,
  Property,
  Unique
} from "@mikro-orm/core"

import {Base} from "../shared/Base.js"
import {Address} from "./Address.js"
import {Sessions} from "./Sessions.js"

@Entity()
export class User extends Base {
  @Property({type: "string"})
  @Unique()
  email_address!: string

  @Property({type: "boolean"})
  emailVerified: Opt<boolean> = false

  @Property({type: "string", nullable: true})
  test?: string

  @Property({type: "string"})
  name!: string

  @OneToMany(() => Sessions, "user")
  sessions = new Collection<Sessions, this>(this)

  @Embedded(() => Address, {object: true, nullable: true})
  address?: Address
}
