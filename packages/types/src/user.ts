export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
}

export interface Friendship {
  id: string
  user: User
  friend: User
  status: 'pending' | 'accepted'
  createdAt: string
}
