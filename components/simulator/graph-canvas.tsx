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
  return lines.slice(0, 3)
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
  className,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 900, h: 600 })
  const [panning, setPanning] = useState<{ startX: number; startY: number; startVBX: number; startVBY: number } | null>(null)

  useEffect(() => {
    if (graph.nodes.length <= 1) {
      setViewBox({ x: 0, y: 0, w: 900, h: 600 })
      return
    }
    const padding = 180
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const node of graph.nodes) {
      minX = Math.min(minX, node.x)
      maxX = Math.max(maxX, node.x)
      minY = Math.min(minY, node.y)
      maxY = Math.max(maxY, node.y)
    }
    const w = Math.max(maxX - minX + padding * 2, 600)
    const h = Math.max(maxY - minY + padding * 2, 400)
    setViewBox({
      x: minX - padding,
      y: minY - padding,
      w,
      h,
    })
  }, [graph.nodes])

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()
      const node = graph.nodes.find((n) => n.id === nodeId)
      if (node?.isGhost) return // ghost nodes can't be dragged
      if (!onNodeDrag) {
        onSelectNode(nodeId)
        return
      }
      if (!node) return
      const pt = getSVGPoint(e)
      setDragging({ nodeId, offsetX: pt.x - node.x, offsetY: pt.y - node.y })
      onSelectNode(nodeId)
    },
    [graph.nodes, getSVGPoint, onNodeDrag, onSelectNode]
  )

  const handleBgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) return
      onSelectNode(null)
      const pt = getSVGPoint(e)
      setPanning({ startX: pt.x, startY: pt.y, startVBX: viewBox.x, startVBY: viewBox.y })
    },
    [dragging, getSVGPoint, onSelectNode, viewBox]
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
        const dx = (e.clientX - rect.left) * scaleX + panning.startVBX - panning.startX
        const dy = (e.clientY - rect.top) * scaleY + panning.startVBY - panning.startY
        setViewBox((v) => ({
          ...v,
          x: panning.startVBX - (dx - panning.startVBX),
          y: panning.startVBY - (dy - panning.startVBY),
        }))
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
    <div className={cn("canvas-container relative overflow-hidden rounded-xl border border-border", className)}>
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        style={{ minHeight: "500px" }}
        onMouseDown={handleBgMouseDown}
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
          const baseRx = isCenter ? 72 : isCons ? 55 : 64
          const baseRy = isCenter ? 44 : isCons ? 24 : 30
          const rx = baseRx * weightScale
          const ry = baseRy * weightScale

          const lines = wrapText(node.label, isCenter ? 18 : isCons ? 16 : 14)
          const fontSize = isCenter ? 13.5 : isCons ? 10.5 : 11.5

          return (
            <g
              key={node.id}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              className={cn(
                "cursor-pointer graph-node",
                isCenter && "node-pulse-glow",
                isGhost && "ghost-node"
              )}
              opacity={isFogged ? 0.25 : isGhost ? 0.7 : 1}
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
              {/* Ghost node accept/reject buttons */}
              {isGhost && onAcceptGhost && onRejectGhost && (
                <g>
                  {/* Accept button */}
                  <g
                    onClick={(e) => { e.stopPropagation(); onAcceptGhost(node.id) }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={node.x + rx + 12}
                      cy={node.y - 8}
                      r={10}
                      fill={COLORS.green}
                      opacity={0.9}
                    />
                    <text
                      x={node.x + rx + 12}
                      y={node.y - 7}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize="11"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      ✓
                    </text>
                  </g>
                  {/* Reject button */}
                  <g
                    onClick={(e) => { e.stopPropagation(); onRejectGhost(node.id) }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={node.x + rx + 12}
                      cy={node.y + 12}
                      r={10}
                      fill={COLORS.red}
                      opacity={0.9}
                    />
                    <text
                      x={node.x + rx + 12}
                      y={node.y + 13}
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
            </g>
          )
        })}
      </svg>
    </div>
  )
}
