export interface Project {
  id: string
  name: string
  color: string
  createdAt: number
}

export interface CreateProjectInput {
  name: string
  color: string
}
