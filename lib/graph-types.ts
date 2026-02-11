export interface GraphNode {
  id: string
  type: "center" | "option" | "consequence"
  label: string
  x: number
  y: number
  risk?: "low" | "medium" | "high"
  parentId?: string // for consequence nodes, which option they belong to
  optionId?: string // back-reference to the option
  weight?: number // 1-5, affects visual size (weighting feature)
  isGhost?: boolean // AI-suggested node, translucent until accepted
  explored?: boolean // for fog-of-war: true if user has interacted
}

export interface GraphEdge {
  id: string
  from: string
  to: string
}

export interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  centerX: number
  centerY: number
}

export function createInitialGraph(
  title: string,
  canvasWidth: number,
  canvasHeight: number
): GraphState {
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  return {
    nodes: [
      {
        id: "center",
        type: "center",
        label: title || "My Decision",
        x: centerX,
        y: centerY,
      },
    ],
    edges: [],
    centerX,
    centerY,
  }
}

export function layoutOptionsRadially(
  graph: GraphState,
  optionLabels: { id: string; label: string }[]
): GraphState {
  const { centerX, centerY } = graph
  const radius = 200
  const centerNode = graph.nodes.find((n) => n.type === "center")!
  const newNodes: GraphNode[] = [centerNode]
  const newEdges: GraphEdge[] = []

  optionLabels.forEach((opt, i) => {
    const angle = (2 * Math.PI * i) / optionLabels.length - Math.PI / 2
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    newNodes.push({
      id: opt.id,
      type: "option",
      label: opt.label,
      x,
      y,
    })
    newEdges.push({
      id: `edge-center-${opt.id}`,
      from: "center",
      to: opt.id,
    })
  })

  return { ...graph, nodes: newNodes, edges: newEdges }
}

export function addConsequenceNodes(
  graph: GraphState,
  optionId: string,
  consequences: { id: string; text: string; risk: "low" | "medium" | "high" }[]
): GraphState {
  const optionNode = graph.nodes.find((n) => n.id === optionId)
  if (!optionNode) return graph

  // Remove old consequence nodes for this option
  const filteredNodes = graph.nodes.filter(
    (n) => !(n.type === "consequence" && n.parentId === optionId)
  )
  const filteredEdges = graph.edges.filter(
    (e) => !e.id.startsWith(`edge-${optionId}-cons-`)
  )

  const newNodes = [...filteredNodes]
  const newEdges = [...filteredEdges]

  // Place consequences radially around the option node
  const baseAngle = Math.atan2(
    optionNode.y - graph.centerY,
    optionNode.x - graph.centerX
  )
  const spread = Math.PI * 0.6
  const consRadius = 120

  consequences.forEach((cons, i) => {
    const offset =
      consequences.length === 1
        ? 0
        : ((i / (consequences.length - 1)) - 0.5) * spread
    const angle = baseAngle + offset
    const x = optionNode.x + consRadius * Math.cos(angle)
    const y = optionNode.y + consRadius * Math.sin(angle)

    newNodes.push({
      id: cons.id,
      type: "consequence",
      label: cons.text,
      x,
      y,
      risk: cons.risk,
      parentId: optionId,
      optionId,
    })
    newEdges.push({
      id: `edge-${optionId}-cons-${cons.id}`,
      from: optionId,
      to: cons.id,
    })
  })

  return { ...graph, nodes: newNodes, edges: newEdges }
}
