"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { useUIStore } from "@/lib/stores/ui"

interface HistogramChartProps {
  values: number[]
  title: string
  xAxisLabel?: string
  yAxisLabel?: string
  binCount?: number
  color?: string
  height?: number
  useLogScale?: boolean
}

export function HistogramChart({
  values,
  title,
  xAxisLabel,
  yAxisLabel = 'Frequency',
  binCount = 30,
  color,
  height = 400,
  useLogScale = false,
}: HistogramChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height })
  const theme = useUIStore((state) => state.theme)
  const isDark = theme === 'dark'
  
  const defaultColor = isDark ? '#3b82f6' : '#2563eb'
  const barColor = color || defaultColor
  
  const textColor = isDark ? '#e5e7eb' : '#0f172a'
  const gridColor = isDark ? 'rgba(156, 163, 175, 0.1)' : 'rgba(100, 116, 139, 0.1)'
  const axisColor = isDark ? '#9ca3af' : '#64748b'
  const backgroundColor = isDark ? '#1e293b' : '#f8fafc'

  // Use resize observer for responsive sizing
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width)
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || values.length === 0) return

    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const width = Math.max(containerWidth - margin.left - margin.right, 300)
    const chartHeight = height - margin.top - margin.bottom

    setDimensions({ width, height: chartHeight })

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height)

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Filter valid values
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v))
    if (validValues.length === 0) return

    // Create histogram bins
    const histogram = d3.bin()
      .domain(d3.extent(validValues) as [number, number])
      .thresholds(binCount)
      .value(d => d)

    const bins = histogram(validValues)
    console.log(bins)
    if (bins.length === 0) return

    // Scales
    // Apply log scale to x-axis if useLogScale is true
    const xScale = useLogScale
      ? d3.scaleLog()
          .domain([Math.max(bins[0].x0!, 0.001), bins[bins.length - 1].x1!]) // Ensure positive values for log scale
          .range([0, width])
          .nice()
      : d3.scaleLinear()
          .domain([bins[0].x0!, bins[bins.length - 1].x1!])
          .range([0, width])
          .nice()
    
    const xDomain = xScale.domain()

    // Y-axis is always linear
    const maxCount = d3.max(bins, d => d.length) || 1
    const yScale = d3.scaleLinear()
      .domain([0, maxCount])
      .range([chartHeight, 0])
      .nice()

    // Create pattern for bars
    const defs = svg.append("defs")
    const pattern = defs.append("pattern")
      .attr("id", `histogram-pattern-${title.replace(/\s+/g, '-')}`)
      .attr("width", 8)
      .attr("height", 8)
      .attr("patternUnits", "userSpaceOnUse")
      .attr("patternTransform", "rotate(45)")

    pattern.append("rect")
      .attr("width", 8)
      .attr("height", 8)
      .attr("fill", backgroundColor)

    pattern.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 8)
      .attr("stroke", axisColor)
      .attr("stroke-width", 1)

    pattern.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 8)
      .attr("y2", 0)
      .attr("stroke", axisColor)
      .attr("stroke-width", 1)

    // Grid lines
    const yAxisGrid = d3.axisLeft(yScale)
      .tickSize(-width)
      .tickFormat(() => "")
      .ticks(5)

    g.append("g")
      .attr("class", "grid")
      .call(yAxisGrid)
      .attr("stroke", gridColor)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")

    // X Axis
    const xAxis = useLogScale
      ? d3.axisBottom(xScale)
          .ticks(8)
          .tickFormat((d) => {
            const value = d as number
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
            return value.toFixed(0)
          })
      : d3.axisBottom(xScale)
          .ticks(8)
          .tickFormat((d) => {
            const value = d as number
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
            return value.toFixed(0)
          })

    const xAxisGroup = g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis)

    xAxisGroup.selectAll("text")
      .attr("fill", axisColor)
      .attr("font-size", "11px")

    xAxisGroup.selectAll("line, path")
      .attr("stroke", axisColor)

    // X Axis Label
    g.append("text")
      .attr("transform", `translate(${width / 2},${chartHeight + 45})`)
      .attr("text-anchor", "middle")
      .attr("fill", textColor)
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .text(xAxisLabel || title)

    // Y Axis
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => {
        const value = d as number
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
        return value.toFixed(0)
      })

    const yAxisGroup = g.append("g")
      .call(yAxis)

    yAxisGroup.selectAll("text")
      .attr("fill", axisColor)
      .attr("font-size", "11px")

    yAxisGroup.selectAll("line, path")
      .attr("stroke", axisColor)

    // Y Axis Label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -chartHeight / 2)
      .attr("text-anchor", "middle")
      .attr("fill", textColor)
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .text(yAxisLabel)

    // Bars with animation
    const bars = g.selectAll(".bar")
      .data(bins)

    const barsEnter = bars.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.x0!))
      .attr("width", d => Math.max(0, xScale(d.x1!) - xScale(d.x0!) - 1))
      .attr("y", chartHeight)
      .attr("height", 0)
      .attr("fill", `url(#histogram-pattern-${title.replace(/\s+/g, '-')})`)
      .attr("stroke", barColor)
      .attr("stroke-width", 1.5)
      .style("opacity", 0.15)

    barsEnter
      .merge(bars as any)
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr("x", d => xScale(d.x0!))
      .attr("width", d => Math.max(0, xScale(d.x1!) - xScale(d.x0!) - 1))
      .attr("y", d => {
        return yScale(d.length)
      })
      .attr("height", d => {
        return chartHeight - yScale(d.length)
      })
      .style("opacity", 0.85)

    bars.exit()
      .transition()
      .duration(400)
      .ease(d3.easeCubicIn)
      .attr("height", 0)
      .attr("y", chartHeight)
      .style("opacity", 0)
      .remove()

    // Density curve (KDE)
    // Calculate appropriate bandwidth based on data range and standard deviation
    const dataRange = xDomain[1] - xDomain[0]
    if (dataRange <= 0) return // Skip if invalid domain
    const dataStdDev = d3.deviation(validValues) || dataRange / 4
    // Use Silverman's rule of thumb for bandwidth, adjusted for the data
    const bandwidth = 1.06 * dataStdDev * Math.pow(validValues.length, -0.2)
    const adjustedBandwidth = Math.max(bandwidth, dataRange / 100) // Ensure minimum bandwidth
    
    // Generate smooth curve points across the domain
    const numTicks = Math.max(100, Math.floor(width / 2))
    const xTicks: number[] = []
    for (let i = 0; i <= numTicks; i++) {
      xTicks.push(xDomain[0] + (xDomain[1] - xDomain[0]) * (i / numTicks))
    }
    
    const kde = kernelDensityEstimator(kernelEpanechnikov(adjustedBandwidth), xTicks)
    const density = kde(validValues)
    
    // Filter out invalid density values
    const validDensity = density.filter(d => 
      d[1] > 0 && 
      isFinite(d[1]) && 
      isFinite(d[0]) &&
      d[0] >= xDomain[0] && 
      d[0] <= xDomain[1]
    )
    
    if (validDensity.length > 1) {
      // Convert density (probability density) to expected count per bin
      // The density is already normalized, so we multiply by:
      // - number of data points (to get expected counts)
      // - average bin width (to account for the histogram binning)
      const avgBinWidth = dataRange / binCount
      const densityToCount = validValues.length * avgBinWidth
      
      const line = d3.line<[number, number]>()
        .x(d => {
          const x = xScale(d[0])
          return isFinite(x) ? x : 0
        })
        .y(d => {
          const count = d[1] * densityToCount
          const y = yScale(Math.max(0, count))
          return isFinite(y) ? y : chartHeight
        })
        .curve(d3.curveBasis)
        .defined(d => d[1] > 0 && isFinite(d[1]) && isFinite(d[0]))

      const densityLine = g.append("path")
        .datum(validDensity)
        .attr("fill", "none")
        .attr("stroke", barColor)
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("d", line)
        .style("opacity", 0)

      densityLine
        .transition()
        .duration(1000)
        .ease(d3.easeCubicOut)
        .style("opacity", 0.85)
    }

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "histogram-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)")
      .style("border", `1px solid ${isDark ? '#334155' : '#e2e8f0'}`)
      .style("border-radius", "6px")
      .style("padding", "8px 12px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
      .style("z-index", "1000")

    barsEnter
      .merge(bars as any)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", 2.5)
          .style("opacity", 1)

        tooltip.transition()
          .duration(200)
          .style("opacity", 1)

        const binStart = d.x0!.toFixed(2)
        const binEnd = d.x1!.toFixed(2)
        const count = d.length
        const percentage = ((count / validValues.length) * 100).toFixed(1)

        tooltip.html(`
          <div style="font-weight: 600; color: ${textColor}; margin-bottom: 4px;">
            ${binStart} to ${binEnd}
          </div>
          <div style="color: ${axisColor};">
            <strong>Count:</strong> ${count.toLocaleString()}<br/>
            <strong>Percentage:</strong> ${percentage}%
          </div>
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", 1.5)
          .style("opacity", 0.85)

        tooltip.transition()
          .duration(200)
          .style("opacity", 0)
      })

    // Cleanup function
    return () => {
      tooltip.remove()
    }
    }, [values, containerWidth, height, binCount, barColor, textColor, axisColor, gridColor, backgroundColor, xAxisLabel, yAxisLabel, title, isDark, useLogScale])

  // Kernel density estimation functions
  function kernelEpanechnikov(k: number) {
    return (v: number) => {
      return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0
    }
  }

  function kernelDensityEstimator(kernel: (v: number) => number, X: number[]) {
    return (V: number[]) => {
      return X.map(x => [
        x,
        d3.mean(V, v => kernel(x - v)) || 0
      ] as [number, number])
    }
  }

  if (values.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-sm text-muted-foreground">No valid data to display</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

