"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import data from "../../data/course.json";
import { fetchCourseData } from '@/lib/api';
import type { CourseEnrollmentData } from '@/lib/api';
import { prefetchAllCourseData, type PrefetchedData } from '@/lib/prefetch';

const { courses, prereqs } = data;

interface Point {
  x: number;
  y: number;
}

interface Course {
  id: string;
  name: string;
  x: number;
  y: number;
}

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
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<CourseEnrollmentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(true);
  const [prefetchProgress, setPrefetchProgress] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [prefetchedData, setPrefetchedData] = useState<PrefetchedData | null>(null);
  const [prefetchErrors, setPrefetchErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        handleClosePopup();
      }
    }

    if (selectedCourse) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [selectedCourse]);

  useEffect(() => {
    async function loadData() {
      try {
        setIsPrefetching(true);
        setPrefetchProgress(0);
        
        // Try to load from local storage first
        const cached = localStorage.getItem('prefetchedData');
        let existingData: PrefetchedData | null = null;
        
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
            existingData = parsed;
            // Don't return early, check if we need to fetch missing courses
          }
        }

        // Get list of courses that need fetching
        const coursesToFetch = courses.filter(course => 
          !existingData?.courses[course.id]
        );

        if (coursesToFetch.length === 0 && existingData) {
          setPrefetchedData(existingData);
          setPrefetchProgress(100);
          return;
        }

        // If we have existing data, start with that
        const newData: PrefetchedData = existingData || {
          timestamp: Date.now(),
          courses: {}
        };

        // Fetch missing courses
        //const totalCourses = coursesToFetch.length;
        let completedCourses = 0;
        
        const fetchedData = await prefetchAllCourseData(coursesToFetch, (progress) => {
          completedCourses = progress;
          const existingCount = courses.length - coursesToFetch.length;
          const totalProgress = Math.round(((completedCourses + existingCount) / courses.length) * 100);
          setPrefetchProgress(totalProgress);
        });
        
        // Merge new data with existing data
        const mergedData: PrefetchedData = {
          timestamp: Date.now(),
          courses: {
            ...newData.courses,
            ...fetchedData.courses
          }
        };
        
        setPrefetchedData(mergedData);
        localStorage.setItem('prefetchedData', JSON.stringify(mergedData));
        
        // Check for any courses that failed to fetch
        const errors: Record<string, boolean> = {};
        courses.forEach(course => {
          if (!mergedData.courses[course.id]) {
            errors[course.id] = true;
          }
        });
        setPrefetchErrors(errors);
      } catch (error) {
        console.error('Error prefetching data:', error);
      } finally {
        setIsPrefetching(false);
      }
    }

    loadData();
  }, []);

  const createPath = (start: Point, end: Point) => {
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - transform.x,
        y: e.clientY - transform.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * ZOOM_STEP;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, transform.scale + delta));

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setTransform((prev) => ({
        scale: newScale,
        x: x - (x - prev.x) * (newScale / prev.scale),
        y: y - (y - prev.y) * (newScale / prev.scale)
      }));
    }
  };

  const handleCourseClick = async (course: Course) => {
    setSelectedCourse(course);
    setIsLoading(true);
    try {
      let data: CourseEnrollmentData;
      if (prefetchedData?.courses[course.id]) {
        data = prefetchedData.courses[course.id];
      } else {
        // If data wasn't prefetched successfully, try fetching it now
        data = await fetchCourseData(course.id);
        // Update prefetched data
        setPrefetchedData(prev => {
          const newData = {
            timestamp: Date.now(),
            courses: {
              ...(prev?.courses || {}),
              [course.id]: data
            }
          };
          // Update local storage with new data
          localStorage.setItem('prefetchedData', JSON.stringify(newData));
          return newData;
        });
        // Clear error state for this course
        setPrefetchErrors(prev => ({
          ...prev,
          [course.id]: false
        }));
      }
      setEnrollmentData(data);
    } catch (error) {
      console.error('Error fetching enrollment data:', error);
      setEnrollmentData(null);
      setPrefetchErrors(prev => ({
        ...prev,
        [course.id]: true
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosePopup = () => {
    setSelectedCourse(null);
    setEnrollmentData(null);
  };

  return (
    <div className="fixed inset-0 bg-gray-50">
      {isPrefetching && (
        <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Prefetching course data: {prefetchProgress}%</span>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <button
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(MIN_ZOOM, prev.scale - ZOOM_STEP) }))}
          className="p-2 bg-white shadow rounded hover:bg-gray-100"
        >
          Zoom Out
        </button>
        <button
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(MAX_ZOOM, prev.scale + ZOOM_STEP) }))}
          className="p-2 bg-white shadow rounded hover:bg-gray-100"
        >
          Zoom In
        </button>
        <button
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          className="p-2 bg-white shadow rounded hover:bg-gray-100"
        >
          Reset
        </button>
      </div>

      {selectedCourse && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <Card className="w-[500px]" ref={popupRef}>
            <CardHeader>
              <CardTitle>{selectedCourse.id} - {selectedCourse.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : enrollmentData ? (
                <div className="space-y-2">
                  <p>Current Semester Students Enrolled: {enrollmentData.currentEnrollment}</p>
                  <p>Current Semester Maximum Capacity: {enrollmentData.currentCapacity}</p>
                  <p>Previous Semester Students Enrolled: {enrollmentData.pastEnrollment}</p>
                  <p>Previous Semester Maximum Capacity: {enrollmentData.pastCapacity}</p>
                </div>
              ) : (
                <p className="text-red-500">Error loading course data</p>
              )}
              <button
                onClick={handleClosePopup}
                className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Close
              </button>
            </CardContent>
          </Card>
        </div>
      )}

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

          {prereqs.map((prereq, index) => {
            const fromCourse = courses.find((c) => c.id === prereq.from);
            const toCourse = courses.find((c) => c.id === prereq.to);

            if (fromCourse && toCourse) {
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
            }
            return null;
          })}

          {courses.map((course) => (
            <g key={course.id} onClick={() => handleCourseClick(course)}>
              <rect
                x={course.x - BOX_WIDTH / 2}
                y={course.y - BOX_HEIGHT / 2}
                width={BOX_WIDTH}
                height={BOX_HEIGHT}
                rx={CORNER_RADIUS}
                ry={CORNER_RADIUS}
                fill={prefetchErrors[course.id] ? "#fee2e2" : "white"}
                stroke={prefetchErrors[course.id] ? "#ef4444" : "#333"}
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
