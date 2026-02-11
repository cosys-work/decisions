"use client"

import React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import type { GraphState, GraphNode } from "@/lib/graph-types"
import { cn } from "@/lib/utils"

interface GraphCanvasProps {
  graph: GraphState
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
  onNodeDrag?: (id: string, x: number, y: number) => void
  highlightedOptionId?: string | null
  winningOptionId?: string | null
  onAcceptGhost?: (nodeId: string) => void
  onRejectGhost?: (nodeId: string) => void
  onEditNode?: (nodeId: string, newLabel: string) => void
  onAddChildNode?: (parentNodeId: string) => void
  onDeleteNode?: (nodeId: string) => void
  className?: string
}

// Color palette from spec
const COLORS = {
  bg: "hsl(36 33% 97%)",
  bgDark: "hsl(37 30% 95%)",
  charcoal: "hsl(30 10% 15%)",
  border: "hsl(34 18% 88%)",
  borderLight: "hsl(34 18% 82%)",
  accent: "hsl(186 50% 42%)",
  accentLight: "hsl(186 50% 42% / 0.15)",
  accentGlow: "hsl(186 50% 42% / 0.3)",
  green: "hsl(152 45% 45%)",
  greenLight: "hsl(152 45% 45% / 0.12)",
  orange: "hsl(36 80% 60%)",
  orangeLight: "hsl(36 80% 60% / 0.12)",
  red: "hsl(12 80% 55%)",
  redLight: "hsl(12 80% 55% / 0.12)",
  purple: "hsl(270 50% 55%)",
  purpleLight: "hsl(270 50% 55% / 0.12)",
  purpleBorder: "hsl(270 50% 55% / 0.5)",
}

function getRiskColor(risk?: "low" | "medium" | "high") {
  switch (risk) {
    case "low":
      return { fill: COLORS.greenLight, stroke: COLORS.green, text: COLORS.green }
    case "medium":
      return { fill: COLORS.orangeLight, stroke: COLORS.orange, text: COLORS.charcoal }
    case "high":
      return { fill: COLORS.redLight, stroke: COLORS.red, text: COLORS.red }
    default:
      return { fill: COLORS.accentLight, stroke: COLORS.accent, text: COLORS.charcoal }
  }
}

function getNodeColors(node: GraphNode, isSelected: boolean, isHighlighted: boolean, isWinning: boolean) {
  if (node.isGhost) {
    return {
      fill: COLORS.purpleLight,
      stroke: COLORS.purpleBorder,
      text: COLORS.purple,
      strokeWidth: 1.5,
      dashArray: "6 3",
    }
  }

  if (node.type === "center") {
    return {
      fill: isSelected ? COLORS.accentLight : COLORS.bgDark,
      stroke: COLORS.accent,
      text: COLORS.charcoal,
      strokeWidth: isSelected ? 3 : 2.5,
      dashArray: "none",
    }
  }

  if (node.type === "option") {
    const active = isSelected || isHighlighted || isWinning
    return {
      fill: active ? COLORS.accentLight : COLORS.bgDark,
      stroke: active ? COLORS.accent : COLORS.borderLight,
      text: COLORS.charcoal,
      strokeWidth: active ? 2.5 : 1.5,
      dashArray: "none",
    }
  }

  // consequence
  const colors = getRiskColor(node.risk)
  return {
    fill: isSelected ? `${colors.stroke.replace(")", " / 0.2)")}` : colors.fill,
    stroke: colors.stroke,
    text: colors.text,
    strokeWidth: isSelected ? 2.5 : 1.5,
    dashArray: "none",
  }
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return `M ${x1} ${y1} L ${x2} ${y2}`
  const curvature = Math.min(dist * 0.2, 40)

  const nx = -dy / dist * curvature
  const ny = dx / dist * curvature

  const cx = midX + nx
  const cy = midY + ny

  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current.length > 0) {
      lines.push(current.trim())
      current = word
    } else {
      current += (current ? " " : "") + word
    }
  }
  if (current) lines.push(current.trim())
  // Allow up to 5 lines; truncate last line with ellipsis if needed
  if (lines.length > 5) {
    const truncated = lines.slice(0, 5)
    truncated[4] = truncated[4].slice(0, maxChars - 3) + "..."
    return truncated
  }
  return lines
}

export function GraphCanvas({
  graph,
  selectedNodeId,
  onSelectNode,
  onNodeDrag,
  highlightedOptionId,
  winningOptionId,
  onAcceptGhost,
  onRejectGhost,
  onEditNode,
  onAddChildNode,
  onDeleteNode,
  className,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 900, h: 600 })
  const [panning, setPanning] = useState<{ startClientX: number; startClientY: number; startVBX: number; startVBY: number } | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [hasUserPanned, setHasUserPanned] = useState(false)
  const prevNodeCountRef = useRef(graph.nodes.length)

  // Compute bounding box that fits all nodes
  const computeFitViewBox = useCallback(() => {
    if (graph.nodes.length <= 1) return { x: 0, y: 0, w: 900, h: 600 }
    const padding = 160
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const node of graph.nodes) {
      minX = Math.min(minX, node.x)
      maxX = Math.max(maxX, node.x)
      minY = Math.min(minY, node.y)
      maxY = Math.max(maxY, node.y)
    }
    const w = Math.max(maxX - minX + padding * 2, 600)
    const h = Math.max(maxY - minY + padding * 2, 400)
    return { x: minX - padding, y: minY - padding, w, h }
  }, [graph.nodes])

  // Auto-fit only on initial load (before user has interacted with pan/zoom)
  useEffect(() => {
    const nodeCount = graph.nodes.length
    if (!hasUserPanned) {
      setViewBox(computeFitViewBox())
    }
    prevNodeCountRef.current = nodeCount
  }, [graph.nodes.length, computeFitViewBox, hasUserPanned])

  // Fit all nodes into view (callable by button)
  const fitToView = useCallback(() => {
    setViewBox(computeFitViewBox())
    setHasUserPanned(false)
  }, [computeFitViewBox])

  const getSVGPoint = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!svgRef.current) return { x: 0, y: 0 }
      const rect = svgRef.current.getBoundingClientRect()
      const scaleX = viewBox.w / rect.width
      const scaleY = viewBox.h / rect.height
      return {
        x: (e.clientX - rect.left) * scaleX + viewBox.x,
        y: (e.clientY - rect.top) * scaleY + viewBox.y,
      }
    },
    [viewBox]
  )

  // Convert SVG coords to screen position for overlay
  const getScreenPosition = useCallback((svgX: number, svgY: number) => {
    if (!svgRef.current || !containerRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    const scaleX = rect.width / viewBox.w
    const scaleY = rect.height / viewBox.h
    return {
      x: (svgX - viewBox.x) * scaleX + rect.left - containerRect.left,
      y: (svgY - viewBox.y) * scaleY + rect.top - containerRect.top,
    }
  }, [viewBox])

  // Start inline editing
  function startEditing(nodeId: string) {
    const node = graph.nodes.find((n) => n.id === nodeId)
    if (!node || node.isGhost) return
    setEditingNodeId(nodeId)
    setEditText(node.label)
  }

  // Finish inline editing
  function finishEditing() {
    if (editingNodeId && editText.trim() && onEditNode) {
      onEditNode(editingNodeId, editText.trim())
    }
    setEditingNodeId(null)
    setEditText("")
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      if (editingNodeId) return
      const node = graph.nodes.find((n) => n.id === nodeId)
      if (node?.isGhost) return
      if (!onNodeDrag) {
        onSelectNode(nodeId)
        return
      }
      if (!node) return
      const pt = getSVGPoint(e)
      setDragging({ nodeId, offsetX: pt.x - node.x, offsetY: pt.y - node.y })
      onSelectNode(nodeId)
    },
    [graph.nodes, getSVGPoint, onNodeDrag, onSelectNode, editingNodeId]
  )

  // Double-click to edit
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      e.preventDefault()
      if (!onEditNode) return
      startEditing(nodeId)
    },
    [onEditNode, graph.nodes]
  )

  // Pan: store raw client coords for stable delta calculation
  const handleBgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (dragging || editingNodeId) return
      onSelectNode(null)
      setPanning({
        startClientX: e.clientX,
        startClientY: e.clientY,
        startVBX: viewBox.x,
        startVBY: viewBox.y,
      })
    },
    [dragging, editingNodeId, onSelectNode, viewBox]
  )

  // Scroll wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      // Zoom toward cursor position
      const mouseXRatio = (e.clientX - rect.left) / rect.width
      const mouseYRatio = (e.clientY - rect.top) / rect.height
      setViewBox((v) => {
        const newW = Math.max(200, Math.min(4000, v.w * zoomFactor))
        const newH = Math.max(150, Math.min(3000, v.h * zoomFactor))
        const dw = newW - v.w
        const dh = newH - v.h
        return {
          x: v.x - dw * mouseXRatio,
          y: v.y - dh * mouseYRatio,
          w: newW,
          h: newH,
        }
      })
      setHasUserPanned(true)
    },
    []
  )

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (dragging && onNodeDrag && svgRef.current) {
        const pt = getSVGPoint(e as unknown as React.MouseEvent)
        onNodeDrag(dragging.nodeId, pt.x - dragging.offsetX, pt.y - dragging.offsetY)
      }
      if (panning && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        const scaleX = viewBox.w / rect.width
        const scaleY = viewBox.h / rect.height
        // Delta in client pixels → convert to SVG units → subtract from start viewBox
        const dxClient = e.clientX - panning.startClientX
        const dyClient = e.clientY - panning.startClientY
        setViewBox((v) => ({
          ...v,
          x: panning.startVBX - dxClient * scaleX,
          y: panning.startVBY - dyClient * scaleY,
        }))
        setHasUserPanned(true)
      }
    }

    function handleMouseUp() {
      setDragging(null)
      setPanning(null)
    }

    if (dragging || panning) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [dragging, panning, onNodeDrag, getSVGPoint, viewBox])

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))

  // Determine which option groups are "explored" (have consequences or are selected)
  const exploredOptionIds = new Set<string>()
  if (highlightedOptionId) exploredOptionIds.add(highlightedOptionId)
  for (const node of graph.nodes) {
    if (node.type === "consequence" && node.parentId) {
      exploredOptionIds.add(node.parentId)
    }
  }

  return (
    <div ref={containerRef} className={cn("canvas-container relative overflow-hidden bg-background", className)}>
      {/* Fit-to-view / zoom controls */}
      <div className="absolute top-3 left-3 z-10 flex gap-1.5">
        <button
          onClick={fitToView}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white/90 text-muted-foreground shadow-sm hover:bg-white hover:text-foreground transition-colors"
          title="Fit all nodes in view"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
        <button
          onClick={() => {
            setViewBox((v) => {
              const f = 0.85
              const newW = Math.max(200, v.w * f)
              const newH = Math.max(150, v.h * f)
              return { x: v.x + (v.w - newW) / 2, y: v.y + (v.h - newH) / 2, w: newW, h: newH }
            })
            setHasUserPanned(true)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white/90 text-muted-foreground shadow-sm hover:bg-white hover:text-foreground transition-colors text-lg font-medium"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => {
            setViewBox((v) => {
              const f = 1.18
              const newW = Math.min(4000, v.w * f)
              const newH = Math.min(3000, v.h * f)
              return { x: v.x + (v.w - newW) / 2, y: v.y + (v.h - newH) / 2, w: newW, h: newH }
            })
            setHasUserPanned(true)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white/90 text-muted-foreground shadow-sm hover:bg-white hover:text-foreground transition-colors text-lg font-medium"
          title="Zoom out"
        >
          −
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        style={{ minHeight: "500px" }}
        onMouseDown={handleBgMouseDown}
        onWheel={handleWheel}
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={`${COLORS.border}80`}
              strokeWidth="0.5"
            />
          </pattern>
          <filter id="ghost-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
          </filter>
          <filter id="fog-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
          </filter>
        </defs>
        <rect
          x={viewBox.x - 500}
          y={viewBox.y - 500}
          width={viewBox.w + 1000}
          height={viewBox.h + 1000}
          fill="url(#grid)"
        />

        {/* Edges */}
        {graph.edges.map((edge) => {
          const from = nodeMap.get(edge.from)
          const to = nodeMap.get(edge.to)
          if (!from || !to) return null

          const toNode = to
          const isGhostEdge = from.isGhost || to.isGhost
          const belongsToOption = to.parentId || (to.type === "option" ? to.id : from.type === "option" ? from.id : null)
          const isFogged = belongsToOption && highlightedOptionId && belongsToOption !== highlightedOptionId
          const isWinningEdge = winningOptionId && (to.id === winningOptionId || to.parentId === winningOptionId || from.id === winningOptionId)
          const isHighlighted =
            highlightedOptionId &&
            (to.id === highlightedOptionId ||
              from.id === highlightedOptionId ||
              to.parentId === highlightedOptionId ||
              from.parentId === highlightedOptionId)

          let strokeColor = COLORS.borderLight
          if (isGhostEdge) {
            strokeColor = COLORS.purpleBorder
          } else if (toNode.type === "consequence") {
            if (toNode.risk === "high") strokeColor = `${COLORS.red}66`
            else if (toNode.risk === "medium") strokeColor = `${COLORS.orange}66`
            else strokeColor = `${COLORS.green}66`
          }
          if (isHighlighted && !isGhostEdge) {
            strokeColor = COLORS.accent
          }

          return (
            <path
              key={edge.id}
              d={bezierPath(from.x, from.y, to.x, to.y)}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isWinningEdge ? 3 : isHighlighted ? 2 : 1.5}
              strokeDasharray={isGhostEdge ? "4 4" : toNode.type === "consequence" ? "6 3" : "none"}
              opacity={isFogged ? 0.2 : isGhostEdge ? 0.6 : 1}
              className={cn(
                "transition-all duration-300",
                isWinningEdge && "winning-path"
              )}
            />
          )
        })}

        {/* Pulsating ring behind center node */}
        {graph.nodes.filter(n => n.type === "center").map((node) => (
          <ellipse
            key={`pulse-${node.id}`}
            cx={node.x}
            cy={node.y}
            rx={74}
            ry={46}
            fill="none"
            stroke={COLORS.accent}
            strokeWidth="2"
            className="node-pulse-ring"
          />
        ))}

        {/* Nodes */}
        {graph.nodes.map((node) => {
          const isSelected = selectedNodeId === node.id
          const isWinning = winningOptionId === node.id || node.parentId === winningOptionId
          const isHighlighted =
            highlightedOptionId !== undefined &&
            highlightedOptionId !== null &&
            (node.id === highlightedOptionId || node.parentId === highlightedOptionId)

          // Fog of War: dim option groups that are not currently focused
          const belongsToOption = node.parentId || (node.type === "option" ? node.id : null)
          const isFogged = node.type !== "center" && belongsToOption && highlightedOptionId && belongsToOption !== highlightedOptionId

          const colors = getNodeColors(node, isSelected, isHighlighted, isWinning)
          const isCenter = node.type === "center"
          const isCons = node.type === "consequence"
          const isGhost = node.isGhost

          // Weighting: scale node size based on weight (1-5)
          const weightScale = node.weight ? 0.8 + (node.weight / 5) * 0.6 : 1
          const baseRx = isCenter ? 76 : isCons ? 60 : 68
          const baseRy = isCenter ? 44 : isCons ? 26 : 32

          const lines = wrapText(node.label, isCenter ? 18 : isCons ? 16 : 14)
          const fontSize = isCenter ? 13.5 : isCons ? 10.5 : 11.5

          // Grow ellipse vertically to fit text lines
          const lineHeight = fontSize + 2
          const textHeight = lines.length * lineHeight
          const minRy = textHeight / 2 + 8
          const rx = baseRx * weightScale
          const ry = Math.max(baseRy * weightScale, minRy)

          return (
            <g
              key={node.id}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              onDoubleClick={(e) => handleDoubleClick(e, node.id)}
              className={cn(
                "cursor-pointer graph-node",
                isCenter && "node-pulse-glow",
                isGhost && "ghost-node"
              )}
              opacity={isFogged ? 0.25 : isGhost ? 0.92 : 1}
              filter={isFogged ? "url(#fog-blur)" : undefined}
              role="button"
              tabIndex={0}
              aria-label={node.label}
            >
              <ellipse
                cx={node.x}
                cy={node.y}
                rx={rx}
                ry={ry}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={colors.strokeWidth}
                strokeDasharray={colors.dashArray}
                className="transition-all duration-200"
              />
              {lines.map((line, i) => (
                <text
                  key={`${node.id}-line-${i}`}
                  x={node.x}
                  y={node.y + (i - (lines.length - 1) / 2) * (fontSize + 2)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={colors.text}
                  fontSize={fontSize}
                  fontWeight={isCenter ? 600 : isCons ? 400 : 500}
                  fontFamily="Inter, system-ui, sans-serif"
                  className="pointer-events-none select-none"
                >
                  {line}
                </text>
              ))}
              {/* Risk indicator dot for consequences */}
              {isCons && node.risk && !isGhost && (
                <circle
                  cx={node.x + rx - 8}
                  cy={node.y - ry + 8}
                  r={4}
                  fill={
                    node.risk === "high"
                      ? COLORS.red
                      : node.risk === "medium"
                        ? COLORS.orange
                        : COLORS.green
                  }
                />
              )}
              {/* Ghost node accept/reject buttons — always visible at full opacity */}
              {isGhost && onAcceptGhost && onRejectGhost && (
                <g opacity={1}>
                  {/* Accept button */}
                  <g
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onAcceptGhost(node.id) }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={node.x + rx + 16}
                      cy={node.y - 12}
                      r={14}
                      fill={COLORS.green}
                      stroke="white"
                      strokeWidth={2}
                    />
                    <text
                      x={node.x + rx + 16}
                      y={node.y - 11}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      ✓
                    </text>
                  </g>
                  {/* Reject button */}
                  <g
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onRejectGhost(node.id) }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={node.x + rx + 16}
                      cy={node.y + 16}
                      r={14}
                      fill={COLORS.red}
                      stroke="white"
                      strokeWidth={2}
                    />
                    <text
                      x={node.x + rx + 16}
                      y={node.y + 17}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      ✕
                    </text>
                  </g>
                </g>
              )}
              {/* AI suggestion indicator (purple dot) */}
              {isGhost && (
                <circle
                  cx={node.x - rx + 8}
                  cy={node.y - ry + 8}
                  r={5}
                  fill={COLORS.purple}
                />
              )}
              {/* Action buttons for selected non-ghost nodes */}
              {isSelected && !isGhost && editingNodeId !== node.id && (
                <g>
                  {/* Add child node button (+ on option/center nodes) */}
                  {(node.type === "center" || node.type === "option") && onAddChildNode && (
                    <g
                      onClick={(e) => { e.stopPropagation(); onAddChildNode(node.id) }}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={node.x}
                        cy={node.y + ry + 18}
                        r={12}
                        fill={COLORS.accent}
                        opacity={0.9}
                      />
                      <text
                        x={node.x}
                        y={node.y + ry + 19}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize="14"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        +
                      </text>
                    </g>
                  )}
                  {/* Delete node button (× on non-center nodes) */}
                  {node.type !== "center" && onDeleteNode && (
                    <g
                      onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id) }}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={node.x + rx + 4}
                        cy={node.y - ry - 4}
                        r={10}
                        fill={COLORS.red}
                        opacity={0.85}
                      />
                      <text
                        x={node.x + rx + 4}
                        y={node.y - ry - 3}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize="11"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        ✕
                      </text>
                    </g>
                  )}
                  {/* Edit hint */}
                  {onEditNode && (
                    <text
                      x={node.x}
                      y={node.y + ry + (node.type === "center" || node.type === "option" ? 38 : 18)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={COLORS.borderLight}
                      fontSize="9"
                      fontFamily="Inter, system-ui, sans-serif"
                      className="pointer-events-none select-none"
                    >
                      double-click to edit
                    </text>
                  )}
                </g>
              )}
            </g>
          )
        })}
        {/* Inline editing via foreignObject — lives in SVG space so it tracks the node exactly */}
        {editingNodeId && (() => {
          const editNode = graph.nodes.find((n) => n.id === editingNodeId)
          if (!editNode) return null
          const foWidth = 200
          const foHeight = 80
          return (
            <foreignObject
              x={editNode.x - foWidth / 2}
              y={editNode.y - foHeight / 2}
              width={foWidth}
              height={foHeight}
            >
              <div style={{ width: foWidth, height: foHeight, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finishEditing() }
                    if (e.key === "Escape") { setEditingNodeId(null); setEditText("") }
                  }}
                  onBlur={finishEditing}
                  autoFocus
                  rows={3}
                  style={{
                    width: foWidth - 8,
                    resize: "none",
                    borderRadius: 10,
                    border: "2px solid hsl(186 50% 42%)",
                    background: "white",
                    padding: "6px 8px",
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: "Inter, system-ui, sans-serif",
                    outline: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  }}
                />
                <span style={{ marginTop: 2, fontSize: 8, color: "#999" }}>Enter to save · Esc to cancel</span>
              </div>
            </foreignObject>
          )
        })()}
      </svg>
    </div>
  )
}
