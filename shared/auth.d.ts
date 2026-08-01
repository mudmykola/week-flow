declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name: string
    avatarUrl: string | null
    role: 'user' | 'pm' | 'admin'
  }
}

export {}
