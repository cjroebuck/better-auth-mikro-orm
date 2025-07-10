import {Entity, ManyToOne, Property} from "@mikro-orm/core"
import {Base} from "../shared/Base.js"
import {User} from "./User.js"

@Entity({tableName: "accounts"})
export class Account extends Base {
  @ManyToOne(() => User)
  user!: User

  @Property({type: "string"})
  accountId!: string // The ID of the account as provided by the SSO or equal to userId for credential accounts

  @Property({type: "string"})
  providerId!: string // The ID of the oauth provider or 'credential' for email/password

  @Property({nullable: true, type: "string", fieldName: "encrypted_password"})
  password?: string // The actual hashed password

  // OAuth fields
  @Property({nullable: true, type: "string"})
  accessToken?: string

  @Property({nullable: true, type: "string"})
  refreshToken?: string

  @Property({nullable: true, type: "date"})
  accessTokenExpiresAt?: Date

  @Property({nullable: true, type: "date"})
  refreshTokenExpiresAt?: Date

  @Property({nullable: true, type: "string"})
  scope?: string

  @Property({nullable: true, type: "string"})
  idToken?: string
}
