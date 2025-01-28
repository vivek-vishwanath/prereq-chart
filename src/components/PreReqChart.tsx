"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import data from "../../data/course.json";
import { fetchCourseData } from '@/lib/api';
import type { CourseEnrollmentData } from '@/lib/api';
import { prefetchAllCourseData, type PrefetchedData } from '@/lib/prefetch';
import Sidebar from './Sidebar';
import OnboardingModal from './OnboardingModal';

type CourseType = 'required' | 'intelligence' | 'information' | undefined;

interface Point {
  x: number;
  y: number;
  id: string;
}

interface Course {
  id: string;
  name: string;
  x: number;
  y: number;
  type?: CourseType;
}

interface Prereq {
  from: string;
  to: string;
  fromSide?: 'left' | 'right' | 'top' | 'bottom';
  toSide?: 'left' | 'right' | 'top' | 'bottom';
}

interface CourseData {
  courses: Course[];
  prereqs: Prereq[];
}

const { courses, prereqs } = data as CourseData;

// Color constants for course types
const COLORS = {
  required: {
    light: {
      bg: '#fbbf24',      // Amber-400
      text: '#78350f',    // Amber-900
      textSecondary: '#92400e'  // Amber-800
    },
    dark: {
      bg: '#78350f',      // Amber-900
      text: '#fbbf24',    // Amber-400
      textSecondary: '#fcd34d'  // Amber-300
    }
  },
  intelligence: {
    light: {
      bg: '#34d399',      // Emerald-400
      text: '#064e3b',    // Emerald-900
      textSecondary: '#065f46'  // Emerald-800
    },
    dark: {
      bg: '#064e3b',      // Emerald-900
      text: '#34d399',    // Emerald-400
      textSecondary: '#6ee7b7'  // Emerald-300
    }
  },
  information: {
    light: {
      bg: '#fb923c',      // Orange-400
      text: '#7c2d12',    // Orange-900
      textSecondary: '#9a3412'  // Orange-800
    },
    dark: {
      bg: '#7c2d12',      // Orange-900
      text: '#fb923c',    // Orange-400
      textSecondary: '#fdba74'  // Orange-300
    }
  }
} as const;

// Add a type for the default connection sides
const DEFAULT_CONNECTION = {
  fromSide: 'right' as const,
  toSide: 'left' as const
};

const PreReqChart = () => {
  const BOX_WIDTH = 160;
  const BOX_HEIGHT = 80;
  const ID_SECTION_HEIGHT = 30;
  const CORNER_RADIUS = 12;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

  const [showOnboarding, setShowOnboarding] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filters, setFilters] = useState({
    showIntelligence: true,
    showInformation: true
  });
  const [highlightedCourse, setHighlightedCourse] = useState<string | null>(null);

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
        const totalToFetch = coursesToFetch.length;
        let completedCourses = 0;
        
        const fetchedData = await prefetchAllCourseData(coursesToFetch, (progress) => {
          completedCourses = progress;
          const existingCount = courses.length - totalToFetch;
          const totalProgress = Math.round(((completedCourses + existingCount) / courses.length) * 100);
          setPrefetchProgress(totalProgress);
        }).catch(error => {
          console.error('Error during prefetch:', error);
          // Return empty data to continue execution
          return { courses: {} };
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

  // Add dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const getConnectionPoint = (course: Course, side: 'left' | 'right' | 'top' | 'bottom' = 'right', isLogicGate: boolean = false) => {
    const x = course.x * 192;
    const y = course.y * 96;
    const size = isLogicGate ? 40 : BOX_WIDTH;
    const height = isLogicGate ? 40 : BOX_HEIGHT;

    switch(side) {
      case 'left':
        return { x: x - size/2, y };
      case 'right':
        return { x: x + size/2, y };
      case 'top':
        return { x, y: y - height/2 };
      case 'bottom':
        return { x, y: y + height/2 };
      default:
        return { x: x + size/2, y };
    }
  };

  const createPath = (start: Point, end: Point, prereq: Prereq) => {
    const isEndLogicGate = end.id === "&" || end.id === "OR";
    const isStartLogicGate = start.id === "&" || start.id === "OR";

    // Use default connection sides unless overridden
    const { fromSide, toSide } = { ...DEFAULT_CONNECTION, ...prereq };

    const startPoint = getConnectionPoint(start as Course, fromSide, isStartLogicGate);
    const endPoint = getConnectionPoint(end as Course, toSide, isEndLogicGate);

    // For vertical connections (top/bottom)
    if ((fromSide === 'bottom' && toSide === 'top') ||
        (fromSide === 'top' && toSide === 'bottom')) {
      const midY = (startPoint.y + endPoint.y) / 2;
      return `M ${startPoint.x} ${startPoint.y}
              C ${startPoint.x} ${midY},
                ${endPoint.x} ${midY},
                ${endPoint.x} ${endPoint.y}`;
    }

    // For horizontal connections with smoother curves
    const distance = endPoint.x - startPoint.x;
    const thirdDistance = distance / 3;

    return `M ${startPoint.x} ${startPoint.y}
            h ${thirdDistance/2}
            C ${startPoint.x + thirdDistance} ${startPoint.y},
              ${endPoint.x - thirdDistance} ${endPoint.y},
              ${endPoint.x - thirdDistance/2} ${endPoint.y}
            h ${thirdDistance/2}`;
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
    // Skip data fetching for AND/OR nodes
    if (course.id === "&" || course.id === "OR") {
      return;
    }

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

  // Add filter handler
  const handleFilterChange = (key: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Filter courses based on thread visibility
  const visibleCourses = courses.filter(course => {
    if (course.type === 'intelligence' && !filters.showIntelligence) return false;
    if (course.type === 'information' && !filters.showInformation) return false;
    return true;
  });

  // Filter prerequisites based on visible courses
  const visiblePrereqs = prereqs.filter(prereq => {
    const fromCourse = courses.find(c => c.id === prereq.from);
    const toCourse = courses.find(c => c.id === prereq.to);
    
    // Check if both courses exist and are visible
    if (!fromCourse || !toCourse) return false;
    
    // If either course is filtered out, don't show the arrow
    if (fromCourse.type === 'intelligence' && !filters.showIntelligence) return false;
    if (fromCourse.type === 'information' && !filters.showInformation) return false;
    if (toCourse.type === 'intelligence' && !filters.showIntelligence) return false;
    if (toCourse.type === 'information' && !filters.showInformation) return false;
    
    return true;
  });

  // Function to get all prerequisites for a course (recursive)
  const getAllPrerequisites = (courseId: string, visited = new Set<string>()): Set<string> => {
    if (visited.has(courseId)) return visited;
    visited.add(courseId);
    
    prereqs.forEach(prereq => {
      if (prereq.to === courseId) {
        getAllPrerequisites(prereq.from, visited);
      }
    });
    
    return visited;
  };

  // Function to check if a course should be highlighted
  const shouldHighlight = (courseId: string): boolean => {
    if (!highlightedCourse) return true;
    const prerequisites = getAllPrerequisites(highlightedCourse);
    return prerequisites.has(courseId);
  };

  // Update course rendering to include highlighting
  const renderCourse = (course: Course) => {
    const isHighlighted = shouldHighlight(course.id);
    const opacity = isHighlighted ? "1" : "0.3";

    // Special rendering for AND/OR nodes
    if (course.id === "&" || course.id === "OR") {
      const size = 40;
      return (
        <g 
          key={course.id}
          style={{ transition: 'opacity 0.3s ease' }}
          opacity={opacity}
        >
          <path
            d={`M ${course.x * 192} ${course.y * 96 - size/2} 
                L ${course.x * 192 + size/2} ${course.y * 96}
                L ${course.x * 192} ${course.y * 96 + size/2}
                L ${course.x * 192 - size/2} ${course.y * 96}
                Z`}
            fill={darkMode ? "#1f2937" : "#f3f4f6"}
            stroke={darkMode ? "#4b5563" : "#9ca3af"}
            strokeWidth="2"
            className="transition-colors duration-200"
          />
          <text
            x={course.x * 192}
            y={course.y * 96 + 6}
            textAnchor="middle"
            className="text-sm font-bold"
            fill={darkMode ? "#e5e7eb" : "#4b5563"}
          >
            {course.id === "&" ? "AND" : "OR"}
          </text>
        </g>
      );
    }

    // Regular course rendering
    return (
      <g 
        key={course.id} 
        onClick={() => handleCourseClick(course)}
        onMouseEnter={() => setHighlightedCourse(course.id)}
        onMouseLeave={() => setHighlightedCourse(null)}
        style={{ transition: 'opacity 0.3s ease' }}
        opacity={opacity}
      >
        <rect
          x={course.x * 192 - BOX_WIDTH / 2}
          y={course.y * 96 - BOX_HEIGHT / 2}
          width={BOX_WIDTH}
          height={BOX_HEIGHT}
          rx={CORNER_RADIUS}
          ry={CORNER_RADIUS}
          fill={course.type ? (darkMode ? COLORS[course.type].dark.bg : COLORS[course.type].light.bg) : (darkMode ? "#1f2937" : "white")}
          stroke={prefetchErrors[course.id] ? "#ef4444" : (darkMode ? "#4b5563" : "#e5e7eb")}
          strokeWidth={prefetchErrors[course.id] ? "3" : "2"}
          className="cursor-pointer transition-colors duration-200"
        />

        <line
          x1={course.x * 192 - BOX_WIDTH / 2 + CORNER_RADIUS}
          y1={course.y * 96 - BOX_HEIGHT / 2 + ID_SECTION_HEIGHT}
          x2={course.x * 192 + BOX_WIDTH / 2 - CORNER_RADIUS}
          y2={course.y * 96 - BOX_HEIGHT / 2 + ID_SECTION_HEIGHT}
          stroke={darkMode ? "#4b5563" : "#e5e7eb"}
          strokeWidth="1"
        />

        <text
          x={course.x * 192}
          y={course.y * 96 - BOX_HEIGHT / 2 + ID_SECTION_HEIGHT/2 + 6}
          textAnchor="middle"
          fill={course.type ? (darkMode ? COLORS[course.type].dark.text : COLORS[course.type].light.text) : (darkMode ? "#f3f4f6" : "#111827")}
          className="text-base font-bold"
        >
          {course.id}
        </text>

        <foreignObject
          x={course.x * 192 - BOX_WIDTH / 2 + 10}
          y={course.y * 96 - BOX_HEIGHT / 2 + ID_SECTION_HEIGHT + 5}
          width={BOX_WIDTH - 20}
          height={BOX_HEIGHT - ID_SECTION_HEIGHT - 10}
        >
          <div className={`text-center text-sm ${
            course.type 
              ? (darkMode ? `text-${course.type === 'required' ? 'amber' : course.type === 'intelligence' ? 'emerald' : 'orange'}-200` 
                        : `text-${course.type === 'required' ? 'amber' : course.type === 'intelligence' ? 'emerald' : 'orange'}-900`)
              : (darkMode ? 'text-gray-300' : 'text-gray-600')
          }`}
               style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            {course.name}
          </div>
        </foreignObject>
      </g>
    );
  };

  // Update arrow rendering to include highlighting
  const renderArrow = (prereq: Prereq, index: number) => {
    const fromCourse = courses.find((c) => c.id === prereq.from);
    const toCourse = courses.find((c) => c.id === prereq.to);

    if (fromCourse && toCourse) {
      const isHighlighted = highlightedCourse && 
        shouldHighlight(toCourse.id) && 
        shouldHighlight(fromCourse.id);
      const opacity = !highlightedCourse || isHighlighted ? "1" : "0.1";

      return (
        <path
          key={`arrow-${index}`}
          d={createPath(fromCourse, toCourse, prereq)}
          fill="none"
          stroke={darkMode ? "#9ca3af" : "#666"}
          strokeWidth="3"
          markerEnd="url(#arrowhead)"
          style={{ transition: 'opacity 0.3s ease' }}
          opacity={opacity}
        />
      );
    }
    return null;
  };

  // Update popup positioning to be next to the course
  const getPopupPosition = (course: Course) => {
    const x = course.x * 192;
    const y = course.y * 96;
    const svgRect = svgRef.current?.getBoundingClientRect();
    
    if (!svgRect) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };

    const courseX = (x * transform.scale + transform.x);
    const courseY = (y * transform.scale + transform.y);

    // Position the popup to the right of the course by default
    let left = courseX + (BOX_WIDTH / 2 * transform.scale) + 20;
    const top = courseY - 100;

    // If the popup would go off the right edge, position it to the left of the course
    if (left + 500 > window.innerWidth) {
      left = courseX - (BOX_WIDTH / 2 * transform.scale) - 520;
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
      transform: 'none'
    };
  };

  // Function to get prerequisites with logical relationships
  const getPrerequisites = (courseId: string) => {
    const prereqGroups: {
      direct: string[];
      andGroups: { [key: string]: string[] };
      orGroups: { [key: string]: string[] };
    } = {
      direct: [],
      andGroups: {},
      orGroups: {}
    };

    // First, find all direct connections to AND/OR nodes
    const logicNodes = prereqs
      .filter(prereq => prereq.to === courseId && (prereq.from.includes('&') || prereq.from.includes('OR')))
      .map(prereq => prereq.from);

    // For each logic node, find its prerequisites
    logicNodes.forEach(nodeId => {
      const nodePrereqs = prereqs
        .filter(prereq => prereq.to === nodeId)
        .map(prereq => prereq.from);
      
      if (nodeId.includes('&')) {
        prereqGroups.andGroups[nodeId] = nodePrereqs;
      } else if (nodeId.includes('OR')) {
        prereqGroups.orGroups[nodeId] = nodePrereqs;
      }
    });

    // Find direct prerequisites (not through AND/OR)
    prereqGroups.direct = prereqs
      .filter(prereq => prereq.to === courseId && !prereq.from.includes('&') && !prereq.from.includes('OR'))
      .map(prereq => prereq.from);

    return prereqGroups;
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        darkMode={darkMode}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          darkMode={darkMode}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 shadow-md z-20 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
              aria-label="Toggle sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              GradGT - CS
            </h1>
          </div>
          
          {/* Theme Toggle Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors duration-200 ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-16 h-full">
        {isPrefetching && (
          <div className="fixed top-20 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-50 transition-colors duration-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent dark:border-blue-400 dark:border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-700 dark:text-gray-200">Prefetching course data: {prefetchProgress}%</span>
            </div>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="absolute bottom-20 right-4 flex flex-col gap-2 z-10">
          <button
            onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(MIN_ZOOM, prev.scale - ZOOM_STEP) }))}
            className="p-2.5 shadow rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                     text-gray-700 dark:text-gray-200 transition-colors"
            title="Zoom Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <button
            onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(MAX_ZOOM, prev.scale + ZOOM_STEP) }))}
            className="p-2.5 shadow rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                     text-gray-700 dark:text-gray-200 transition-colors"
            title="Zoom In"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>
          <button
            onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
            className="p-2.5 shadow rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                     text-gray-700 dark:text-gray-200 transition-colors"
            title="Reset View"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        </div>

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className={`absolute inset-0 cursor-grab touch-none ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
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
                <path d="M0,0 L12,4 L0,8 L3,4 Z" fill={darkMode ? "#9ca3af" : "#666"} strokeWidth="3" />
              </marker>
            </defs>

            {visiblePrereqs.map((prereq, index) => renderArrow(prereq, index))}

            {visibleCourses.map((course) => renderCourse(course))}
          </g>
        </svg>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 shadow-md z-20 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Made by{' '}
              <a href="https://www.linkedin.com/in/vineethsendilraj/" target="_blank" rel="noopener noreferrer"
                 className={`underline ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}>
                Vineeth Sendilraj
              </a>
              ,{' '}
              <a href="https://www.linkedin.com/in/vivek-vishwanath1/" target="_blank" rel="noopener noreferrer"
                 className={`underline ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}>
                Vivek
              </a>
              , and{' '}
              <a href="https://www.linkedin.com/in/davehday/" target="_blank" rel="noopener noreferrer"
                 className={`underline ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}>
                Daveh Day
              </a>
              , under the direction of Mary Hudachek-Buswell 
            </span>
          </div>
          <a
            href="https://github.com/VineethSendilraj/GradGT"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
            title="View source on GitHub"
          >
            <svg height="24" viewBox="0 0 16 16" version="1.1" width="24" aria-hidden="true">
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" fill="currentColor"></path>
            </svg>
            <span className="text-sm">Source</span>
          </a>
        </div>
      </footer>

      {/* Popup with dark mode support */}
      {selectedCourse && (
        <div 
          className="fixed z-20"
          style={getPopupPosition(selectedCourse)}
          ref={popupRef}
        >
          <Card className={`w-[500px] ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
            <CardHeader>
              <CardTitle>{selectedCourse.id} - {selectedCourse.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className={`w-12 h-12 border-4 ${darkMode ? 'border-gray-700 border-t-gray-300' : 'border-blue-200 border-t-blue-500'} rounded-full animate-spin`}></div>
                </div>
              ) : enrollmentData ? (
                <div className="space-y-6">
                  <div>
                    <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Prerequisites
                    </h3>
                    <div className="space-y-2">
                      {(() => {
                        const prereqGroups = getPrerequisites(selectedCourse.id);
                        
                        if (prereqGroups.direct.length === 0 && 
                            Object.keys(prereqGroups.andGroups).length === 0 && 
                            Object.keys(prereqGroups.orGroups).length === 0) {
                          return <p className="text-gray-500 dark:text-gray-400">No prerequisites</p>;
                        }

                        return (
                          <div className="space-y-3">
                            {prereqGroups.direct.length > 0 && (
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Required:</p>
                                <ul className="list-disc pl-5 mt-1">
                                  {prereqGroups.direct.map(courseId => (
                                    <li key={courseId}>{courseId}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {Object.entries(prereqGroups.andGroups).map(([nodeId, courses]) => (
                              <div key={nodeId}>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Must complete all:</p>
                                <p className="pl-5 mt-1">
                                  {courses.join(' AND ')}
                                </p>
                              </div>
                            ))}

                            {Object.entries(prereqGroups.orGroups).map(([nodeId, courses]) => (
                              <div key={nodeId}>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Must complete one of:</p>
                                <p className="pl-5 mt-1">
                                  {courses.join(' OR ')}
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Enrollment History
                    </h3>
                    <div className="space-y-2">
                      <p>Current Semester: {enrollmentData.currentEnrollment || 'N/A'}</p>
                      <p>Previous Semester: {enrollmentData.pastEnrollment || 'N/A'}</p>
                      <p>One Year Ago: {enrollmentData.yearAgoEnrollment || 'N/A'}</p>
                      <p>Three Semesters Ago: {enrollmentData.threeTermsAgoEnrollment || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-red-500">Error loading course data</p>
              )}
              <button
                onClick={handleClosePopup}
                className={`mt-4 px-4 py-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                Close
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PreReqChart;
