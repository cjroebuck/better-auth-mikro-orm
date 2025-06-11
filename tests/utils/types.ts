export interface UserInput {
  email: string
  name: string
  address: {
    street: string
    city: string
  }
}

export interface SessionInput {
  token: string
  userId: string
  expiresAt: Date
}
