<script setup lang="ts">
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum
} from 'd3-force'
import type { GraphEdge, GraphNode } from '~/domain/services/graph'

const props = defineProps<{
  nodes: GraphNode[]
  edges: GraphEdge[]
}>()

const emit = defineEmits<{
  select: [node: GraphNode | null]
}>()

type SimNode = GraphNode & SimulationNodeDatum
type SimLink = SimulationLinkDatum<SimNode>

const svgEl = ref<SVGSVGElement | null>(null)
const width = ref(800)
const height = ref(560)

const simNodes = ref<SimNode[]>([])
const simLinks = ref<SimLink[]>([])

let simulation: Simulation<SimNode, SimLink> | null = null

function buildSimulation() {
  simulation?.stop()

  const nodesCopy: SimNode[] = props.nodes.map(node => ({
    ...node,
    x: width.value / 2 + (Math.random() - 0.5) * 120,
    y: height.value / 2 + (Math.random() - 0.5) * 120
  }))

  const nodeById = new Map(nodesCopy.map(node => [node.id, node]))
  const linksCopy: SimLink[] = props.edges
    .map(edge => ({ source: nodeById.get(edge.source)!, target: nodeById.get(edge.target)! }))
    .filter(link => link.source && link.target)

  simulation = forceSimulation(nodesCopy)
    .force('charge', forceManyBody().strength(-140))
    .force('link', forceLink<SimNode, SimLink>(linksCopy).distance(56).strength(0.5))
    .force('center', forceCenter(width.value / 2, height.value / 2))
    .force('collide', forceCollide<SimNode>(node => node.radius + 6))
    .on('tick', () => {
      simNodes.value = nodesCopy
      simLinks.value = linksCopy
    })
}

onMounted(() => {
  if (svgEl.value) {
    width.value = svgEl.value.clientWidth || width.value
    height.value = svgEl.value.clientHeight || height.value
  }
  buildSimulation()
})

watch(() => [props.nodes, props.edges], buildSimulation)

onBeforeUnmount(() => simulation?.stop())

const draggingNode = ref<SimNode | null>(null)

function toSvgPoint(event: PointerEvent) {
  const rect = svgEl.value!.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function startDrag(node: SimNode, event: PointerEvent) {
  draggingNode.value = node
  simulation?.alphaTarget(0.3).restart()
  node.fx = node.x
  node.fy = node.y
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!draggingNode.value) return
  const { x, y } = toSvgPoint(event)
  draggingNode.value.fx = x
  draggingNode.value.fy = y
}

function endDrag() {
  if (!draggingNode.value) return
  draggingNode.value.fx = null
  draggingNode.value.fy = null
  simulation?.alphaTarget(0)
  draggingNode.value = null
}

const selectedId = ref<string | null>(null)
const hoveredId = ref<string | null>(null)

function isDimmed(nodeId: string) {
  if (!hoveredId.value) return false
  if (nodeId === hoveredId.value) return false
  return !simLinks.value.some((link) => {
    const source = link.source as SimNode
    const target = link.target as SimNode
    return (source.id === hoveredId.value && target.id === nodeId)
      || (target.id === hoveredId.value && source.id === nodeId)
  })
}

function handleClick(node: SimNode) {
  selectedId.value = node.id
  emit('select', node)
}

function linkSource(link: SimLink) {
  return link.source as SimNode
}

function linkTarget(link: SimLink) {
  return link.target as SimNode
}
</script>

<template>
  <svg
    ref="svgEl"
    class="h-full w-full touch-none select-none"
    @pointermove="onPointerMove"
    @pointerup="endDrag"
    @pointerleave="endDrag"
  >
    <line
      v-for="(link, i) in simLinks"
      :key="i"
      :x1="linkSource(link).x"
      :y1="linkSource(link).y"
      :x2="linkTarget(link).x"
      :y2="linkTarget(link).y"
      stroke="rgba(0,0,0,0.12)"
      stroke-width="1"
    />
    <g
      v-for="node in simNodes"
      :key="node.id"
      :transform="`translate(${node.x}, ${node.y})`"
      class="cursor-pointer transition-opacity"
      :style="{ opacity: isDimmed(node.id) ? 0.15 : 1 }"
      @pointerdown="startDrag(node, $event)"
      @pointerenter="hoveredId = node.id"
      @pointerleave="hoveredId = null"
      @click="handleClick(node)"
    >
      <circle
        :r="node.radius"
        :fill="node.color"
        :stroke="selectedId === node.id ? '#0f0f0f' : 'rgba(0,0,0,0.15)'"
        :stroke-width="selectedId === node.id ? 2 : 1"
      />
      <text
        v-if="node.kind === 'project' || hoveredId === node.id || selectedId === node.id"
        :y="node.radius + 14"
        text-anchor="middle"
        class="pointer-events-none text-[10px]"
        style="fill: rgba(15,15,15,0.85)"
      >
        {{ node.label.length > 24 ? node.label.slice(0, 24) + '…' : node.label }}
      </text>
    </g>
  </svg>
</template>
