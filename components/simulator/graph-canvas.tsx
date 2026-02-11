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
  className?: string
}

function getRiskColor(risk?: "low" | "medium" | "high") {
  switch (risk) {
    case "low":
      return { fill: "hsl(152 45% 45% / 0.12)", stroke: "hsl(152 45% 45%)", text: "hsl(152 45% 45%)" }
    case "medium":
      return { fill: "hsl(36 80% 60% / 0.12)", stroke: "hsl(36 80% 60%)", text: "hsl(30 10% 15%)" }
    case "high":
      return { fill: "hsl(12 80% 55% / 0.12)", stroke: "hsl(12 80% 55%)", text: "hsl(12 80% 55%)" }
    default:
      return { fill: "hsl(186 50% 42% / 0.08)", stroke: "hsl(186 50% 42%)", text: "hsl(30 10% 15%)" }
  }
}

function getNodeColors(node: GraphNode, isSelected: boolean, isHighlighted: boolean) {
  if (node.type === "center") {
    return {
      fill: isSelected ? "hsl(186 50% 42% / 0.15)" : "hsl(37 30% 95%)",
      stroke: "hsl(186 50% 42%)",
      text: "hsl(30 10% 15%)",
      strokeWidth: isSelected ? 3 : 2.5,
    }
  }

  if (node.type === "option") {
    const base = getRiskColor()
    return {
      fill: isSelected || isHighlighted ? "hsl(186 50% 42% / 0.15)" : "hsl(37 30% 95%)",
      stroke: isSelected || isHighlighted ? "hsl(186 50% 42%)" : "hsl(34 18% 82%)",
      text: "hsl(30 10% 15%)",
      strokeWidth: isSelected || isHighlighted ? 2.5 : 1.5,
    }
  }

  // consequence
  const colors = getRiskColor(node.risk)
  return {
    fill: isSelected ? `${colors.stroke.replace(")", " / 0.2)")}` : colors.fill,
    stroke: colors.stroke,
    text: colors.text,
    strokeWidth: isSelected ? 2.5 : 1.5,
  }
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  const curvature = Math.min(dist * 0.2, 40)

  // perpendicular offset for curve
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
  return lines.slice(0, 3) // max 3 lines
}

export function GraphCanvas({
  graph,
  selectedNodeId,
  onSelectNode,
  onNodeDrag,
  highlightedOptionId,
  className,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 900, h: 600 })
  const [panning, setPanning] = useState<{ startX: number; startY: number; startVBX: number; startVBY: number } | null>(null)

  // compute viewbox to fit all nodes
  useEffect(() => {
    if (graph.nodes.length <= 1) {
      setViewBox({ x: 0, y: 0, w: 900, h: 600 })
      return
    }
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
      if (!onNodeDrag) {
        onSelectNode(nodeId)
        return
      }
      const node = graph.nodes.find((n) => n.id === nodeId)
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

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-card", className)}>
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
              stroke="hsl(34 18% 88% / 0.5)"
              strokeWidth="0.5"
            />
          </pattern>
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
          const isHighlighted =
            highlightedOptionId &&
            (to.id === highlightedOptionId ||
              from.id === highlightedOptionId ||
              to.parentId === highlightedOptionId ||
              from.parentId === highlightedOptionId)

          let strokeColor = "hsl(34 18% 82%)"
          if (toNode.type === "consequence") {
            if (toNode.risk === "high") strokeColor = "hsl(12 80% 55% / 0.4)"
            else if (toNode.risk === "medium") strokeColor = "hsl(36 80% 60% / 0.4)"
            else strokeColor = "hsl(152 45% 45% / 0.4)"
          }
          if (isHighlighted) {
            strokeColor = "hsl(186 50% 42%)"
          }

          return (
            <path
              key={edge.id}
              d={bezierPath(from.x, from.y, to.x, to.y)}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isHighlighted ? 2 : 1.5}
              strokeDasharray={toNode.type === "consequence" ? "6 3" : "none"}
              className="transition-all duration-200"
            />
          )
        })}

        {/* Nodes */}
        {graph.nodes.map((node) => {
          const isSelected = selectedNodeId === node.id
          const isHighlighted =
            highlightedOptionId !== undefined &&
            highlightedOptionId !== null &&
            (node.id === highlightedOptionId || node.parentId === highlightedOptionId)

          const colors = getNodeColors(node, isSelected, isHighlighted)
          const isCenter = node.type === "center"
          const isCons = node.type === "consequence"

          const rx = isCenter ? 70 : isCons ? 55 : 62
          const ry = isCenter ? 42 : isCons ? 22 : 28

          const lines = wrapText(node.label, isCenter ? 18 : isCons ? 16 : 14)
          const fontSize = isCenter ? 13 : isCons ? 10.5 : 11.5

          return (
            <g
              key={node.id}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              className="cursor-pointer"
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
                  fontFamily="var(--font-inter), system-ui, sans-serif"
                  className="pointer-events-none select-none"
                >
                  {line}
                </text>
              ))}
              {/* Risk indicator dot for consequences */}
              {isCons && node.risk && (
                <circle
                  cx={node.x + rx - 8}
                  cy={node.y - ry + 8}
                  r={4}
                  fill={
                    node.risk === "high"
                      ? "hsl(12 80% 55%)"
                      : node.risk === "medium"
                        ? "hsl(36 80% 60%)"
                        : "hsl(152 45% 45%)"
                  }
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
