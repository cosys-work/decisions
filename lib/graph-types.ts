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
  const radius = 280
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
  const spread = Math.PI * 0.8
  const consRadius = 180

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

/**
 * Lightweight force-directed layout simulation.
 * Runs N iterations of: repulsion between all nodes, attraction along edges, center gravity.
 * Returns a new GraphState with updated positions.
 */
export function forceDirectedLayout(
  graph: GraphState,
  iterations = 80
): GraphState {
  if (graph.nodes.length <= 1) return graph

  // Clone positions into mutable map
  const positions = new Map<string, { x: number; y: number; vx: number; vy: number; fixed: boolean }>()
  for (const node of graph.nodes) {
    positions.set(node.id, {
      x: node.x,
      y: node.y,
      vx: 0,
      vy: 0,
      fixed: node.type === "center",
    })
  }

  const nodeIds = graph.nodes.map((n) => n.id)
  const REPULSION = 35000
  const ATTRACTION = 0.004
  const CENTER_GRAVITY = 0.008
  const DAMPING = 0.82
  const IDEAL_EDGE_LEN_CENTER = 280
  const IDEAL_EDGE_LEN_OPTION = 180

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations
    const alpha = 0.3 * temp + 0.05

    // Repulsion: every pair of nodes pushes apart
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const a = positions.get(nodeIds[i])!
        const b = positions.get(nodeIds[j])!
        let dx = b.x - a.x
        let dy = b.y - a.y
        let dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist = 1 }

        const force = REPULSION / (dist * dist)
        const fx = (dx / dist) * force * alpha
        const fy = (dy / dist) * force * alpha

        if (!a.fixed) { a.vx -= fx; a.vy -= fy }
        if (!b.fixed) { b.vx += fx; b.vy += fy }
      }
    }

    // Attraction along edges (spring toward ideal length)
    for (const edge of graph.edges) {
      const a = positions.get(edge.from)
      const b = positions.get(edge.to)
      if (!a || !b) continue

      let dx = b.x - a.x
      let dy = b.y - a.y
      let dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) dist = 1

      const fromNode = graph.nodes.find((n) => n.id === edge.from)
      const idealLen = fromNode?.type === "center" ? IDEAL_EDGE_LEN_CENTER : IDEAL_EDGE_LEN_OPTION
      const displacement = dist - idealLen
      const force = ATTRACTION * displacement
      const fx = (dx / dist) * force * alpha
      const fy = (dy / dist) * force * alpha

      if (!a.fixed) { a.vx += fx; a.vy += fy }
      if (!b.fixed) { b.vx -= fx; b.vy -= fy }
    }

    // Center gravity: pull everything gently toward center
    const cx = graph.centerX
    const cy = graph.centerY
    for (const id of nodeIds) {
      const p = positions.get(id)!
      if (p.fixed) continue
      p.vx += (cx - p.x) * CENTER_GRAVITY * alpha
      p.vy += (cy - p.y) * CENTER_GRAVITY * alpha
    }

    // Apply velocities with damping
    for (const id of nodeIds) {
      const p = positions.get(id)!
      if (p.fixed) continue
      p.vx *= DAMPING
      p.vy *= DAMPING
      p.x += p.vx
      p.y += p.vy
    }
  }

  // Write back rounded positions
  const newNodes = graph.nodes.map((node) => {
    const p = positions.get(node.id)!
    return { ...node, x: Math.round(p.x), y: Math.round(p.y) }
  })

  return { ...graph, nodes: newNodes }
}
