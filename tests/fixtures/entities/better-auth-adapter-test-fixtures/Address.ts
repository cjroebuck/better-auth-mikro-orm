import {Embeddable, Property} from "@mikro-orm/core"

@Embeddable()
export class Address {
  @Property({type: "string"})
  street!: string

  @Property({type: "string"})
  city!: string
}
