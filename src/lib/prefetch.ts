import { fetchCourseData } from './api';

export interface PrefetchedData {
  timestamp: number;
  courses: {
    [courseId: string]: {
      currentEnrollment: number;
      currentCapacity: number;
      pastEnrollment: number;
      pastCapacity: number;
    };
  };
}

export async function prefetchAllCourseData(courses: { id: string }[]): Promise<PrefetchedData> {
  const courseData: PrefetchedData = {
    timestamp: Date.now(),
    courses: {}
  };

  // Fetch data for all courses in parallel
  const promises = courses.map(async (course) => {
    try {
      const data = await fetchCourseData(course.id);
      courseData.courses[course.id] = data;
    } catch (error) {
      console.error(`Error fetching data for course ${course.id}:`, error);
    }
  });

  await Promise.all(promises);
  return courseData;
} 