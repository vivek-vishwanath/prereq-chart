import { fetchCourseData } from './api';
import type { CourseEnrollmentData } from './api';

export interface PrefetchedData {
  timestamp: number;
  courses: {
    [courseId: string]: CourseEnrollmentData;
  };
}

export async function prefetchAllCourseData(
  courses: { id: string }[],
  onProgress: (progress: number) => void
): Promise<PrefetchedData> {
  const prefetchedData: PrefetchedData = {
    timestamp: Date.now(),
    courses: {}
  };

  let completed = 0;
  
  // Process courses sequentially to avoid overwhelming the API
  for (const course of courses) {
    try {
      const data = await fetchCourseData(course.id);
      prefetchedData.courses[course.id] = data;
    } catch (error) {
      console.warn(`Failed to fetch data for course ${course.id}:`, error);
      // Continue with next course even if this one failed
    }
    completed++;
    onProgress(completed);
  }

  return prefetchedData;
} 