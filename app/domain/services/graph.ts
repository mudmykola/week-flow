import type { Project } from '../entities/project'
import type { Task } from '../entities/task'

export interface GraphNode {
  id: string
  label: string
  color: string
  radius: number
  kind: 'project' | 'task'
  status?: Task['status']
  week?: string
  projectId?: string | null
}

export interface GraphEdge {
  source: string
  target: string
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const STATUS_NODE_COLOR: Record<Task['status'], string> = {
  todo: '#9ca3af',
  in_progress: '#0f0f0f',
  done: '#fe5011'
}

export function projectNodeId(projectId: string): string {
  return `project:${projectId}`
}

export function taskNodeId(taskId: string): string {
  return `task:${taskId}`
}

export function buildGraph(projects: Project[], tasks: Task[]): Graph {
  const nodes: GraphNode[] = projects.map(project => ({
    id: projectNodeId(project.id),
    label: project.name,
    color: project.color,
    radius: 16,
    kind: 'project'
  }))

  const edges: GraphEdge[] = []

  for (const task of tasks) {
    const id = taskNodeId(task.id)
    nodes.push({
      id,
      label: task.title,
      color: STATUS_NODE_COLOR[task.status],
      radius: 6,
      kind: 'task',
      status: task.status,
      week: task.week,
      projectId: task.projectId
    })

    if (task.projectId) {
      edges.push({ source: projectNodeId(task.projectId), target: id })
    }
  }

  return { nodes, edges }
}
