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
  onProgress?: (completedCount: number) => void
): Promise<PrefetchedData> {
  const courseData: PrefetchedData = {
    timestamp: Date.now(),
    courses: {}
  };

  let completedCount = 0;

  // Fetch data for all courses in parallel
  const promises = courses.map(async (course) => {
    try {
      const data = await fetchCourseData(course.id);
      courseData.courses[course.id] = data;
      completedCount++;
      onProgress?.(completedCount);
    } catch (error) {
      console.error(`Error fetching data for course ${course.id}:`, error);
    }
  });

  await Promise.all(promises);
  return courseData;
} 