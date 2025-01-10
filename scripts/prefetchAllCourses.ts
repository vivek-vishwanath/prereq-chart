const { writeFileSync } = require('fs');
const { join } = require('path');
const courses = require('../data/course.json');
const { prefetchAllCourseData } = require('../src/lib/prefetch');

async function prefetchAndSaveAllCourses() {
  try {
    // Convert courses.json format to match the expected input
    const courseList = Object.entries(courses).map(([id]) => ({ id }));
    
    // Fetch all course data
    console.log('Fetching course data...');
    const data = await prefetchAllCourseData(courseList);
    
    // Save as JSON
    const jsonPath = join(__dirname, '../data/prefetched-courses.json');
    writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`Saved JSON data to ${jsonPath}`);
  } catch (error) {
    console.error('Error prefetching courses:', error);
  }
}



// Run the script
prefetchAndSaveAllCourses(); 