"use client";

import React, { useState, useRef } from 'react';
import data from "../../data/course.json";

const { courses, prereqs } = data;

const PreReqChart = () => {
  const BOX_WIDTH = 120;
  const BOX_HEIGHT = 60;
  const CORNER_RADIUS = 10;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const createPath = (start, end) => {
    if (start.y === end.y) {
      return `M ${start.x + BOX_WIDTH / 2} ${start.y} 
              L ${end.x - BOX_WIDTH / 2} ${end.y}`;
    }
    const startX = start.x + BOX_WIDTH/2;
    const endX = end.x - BOX_WIDTH/2;
    const distance = endX - startX;
    const thirdDistance = distance / 6;

    return `M ${startX} ${start.y}
            h ${thirdDistance}
            C ${startX + 2 * thirdDistance} ${start.y},
              ${endX - 2 * thirdDistance} ${end.y},
              ${endX - thirdDistance} ${end.y}
            h ${thirdDistance}`;
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - transform.x,
        y: e.clientY - transform.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * ZOOM_STEP;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, transform.scale + delta));

    // Calculate cursor position relative to SVG
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate new position to zoom towards cursor
    setTransform((prev) => ({
      scale: newScale,
      x: x - (x - prev.x) * (newScale / prev.scale),
      y: y - (y - prev.y) * (newScale / prev.scale)
    }));
  };

  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(MAX_ZOOM, prev.scale + ZOOM_STEP)
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(MIN_ZOOM, prev.scale - ZOOM_STEP)
    }));
  };

  const handleReset = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  return (
      <div className="fixed inset-0 bg-gray-50">
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <button
              onClick={handleZoomOut}
              className="p-2 bg-white shadow rounded hover:bg-gray-100"
          >
            Zoom Out
          </button>
          <button
              onClick={handleZoomIn}
              className="p-2 bg-white shadow rounded hover:bg-gray-100"
          >
            Zoom In
          </button>
          <button
              onClick={handleReset}
              className="p-2 bg-white shadow rounded hover:bg-gray-100"
          >
            Reset
          </button>
        </div>
        <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="absolute inset-0 cursor-grab touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {/* Define arrow marker */}
            <defs>
              <marker
                  id="arrowhead"
                  markerWidth="12"
                  markerHeight="8"
                  refX="10"
                  refY="4"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
              >
                <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#666" />
              </marker>
            </defs>

            {/* Draw arrows */}
            {prereqs.map((prereq, index) => {
              const fromCourse = courses.find((c) => c.id === prereq.from);
              const toCourse = courses.find((c) => c.id === prereq.to);

              return (
                  <path
                      key={`arrow-${index}`}
                      d={createPath(fromCourse, toCourse)}
                      fill="none"
                      stroke="#666"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                  />
              );
            })}

            {/* Draw course boxes */}
            {courses.map((course) => (
                <g key={course.id}>
                  <rect
                      x={course.x - BOX_WIDTH / 2}
                      y={course.y - BOX_HEIGHT / 2}
                      width={BOX_WIDTH}
                      height={BOX_HEIGHT}
                      rx={CORNER_RADIUS}
                      ry={CORNER_RADIUS}
                      fill="white"
                      stroke="#333"
                      strokeWidth="2"
                      className="cursor-pointer hover:fill-blue-50 transition-colors"
                  />

                  <text
                      x={course.x}
                      y={course.y - 10}
                      textAnchor="middle"
                      className="text-sm font-bold"
                  >
                    {course.id}
                  </text>

                  <text
                      x={course.x}
                      y={course.y + 12}
                      textAnchor="middle"
                      className="text-xs"
                  >
                    {course.name}
                  </text>
                </g>
            ))}
          </g>
        </svg>
      </div>
  );
};

export default PreReqChart;
