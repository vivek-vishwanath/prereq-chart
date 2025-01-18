export interface CourseEnrollmentData {
    currentEnrollment: number;
    pastEnrollment: number;
    oneYearBackEnrollment: number;
    oneYearOneSemBackEnrollment: number;
}

const courseDataCache = new Map<string, { data: CourseEnrollmentData; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache duration
const pendingRequests = new Map<string, Promise<string>>();

async function fetchWithDedup(url: string, cacheKey: string) {
    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey);
    }
    
    const promise = fetch(url).then(async (response) => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        pendingRequests.delete(cacheKey);
        return data;
    }).catch((error) => {
        pendingRequests.delete(cacheKey);
        throw error;
    });
    
    pendingRequests.set(cacheKey, promise);
    return promise;
}

async function fetchSectionCRNs(term: string, courseName: string) {
    const url = `https://gt-scheduler.github.io/crawler-v2/${term}.json`;
    const cacheKey = `crn-${term}-${courseName}`;
    
    try {
        const data = await fetchWithDedup(url, cacheKey);
        const CRNList: Record<string, string> = {};

        if (!data.courses[courseName]) {
            console.error(`Course ${courseName} not found in term ${term}`);
            return CRNList;
        }

        const courseData = data.courses[courseName];
        
        let sections;
        if (Array.isArray(courseData)) {
            sections = courseData[1] || {};
        } else {
            sections = courseData;
        }

        for (const section in sections) {
            const sectionData = sections[section];
            if (Array.isArray(sectionData) && sectionData.length >= 3 && sectionData[2] !== 0) {
                CRNList[section] = sectionData[0];
            }
        }

        return CRNList;
    } catch (error) {
        console.error("Error fetching CRNs:", error);
        console.error("Course:", courseName, "Term:", term);
        throw error;
    }
}

async function fetchSectionSeatingInfo(term: string, CRN: string) {
    const url = `https://gt-scheduler.azurewebsites.net/proxy/class_section?term=${term}&crn=${CRN}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const seatingInfo: Record<string, string> = {};
        const spans = doc.querySelectorAll('span');
        
        for (let i = 0; i < spans.length; i += 2) {
            if (i + 1 < spans.length) {
                const key = spans[i].innerHTML.slice(0, -1);
                const value = spans[i + 1].innerHTML;
                seatingInfo[key] = value;
            }
        }

        return seatingInfo;
    } catch (error) {
        console.error("Error fetching seating info:", error);
        throw error;
    }
}

async function courseSectionSeatingInfoList(term: string, courseName: string) {
    const CRNList = await fetchSectionCRNs(term, courseName);
    const fetchPromises = Object.entries(CRNList).map(async ([section, crn]) => {
        const info = await fetchSectionSeatingInfo(term, crn);
        return [section, info];
    });
    
    const results = await Promise.all(fetchPromises);
    return Object.fromEntries(results);
}

async function termTotalEnrollment(term: string, courseName: string) {
    const data = await courseSectionSeatingInfoList(term, courseName);
    const totals = {
        'Enrollment Actual': 0,
        'Enrollment Maximum': 0
    };

    for (const section in data) {
        totals['Enrollment Actual'] += parseInt(data[section]['Enrollment Actual']);
        if (parseInt(data[section]['Enrollment Maximum']) === 0) {
            totals['Enrollment Maximum'] += parseInt(data[section]['Enrollment Actual']);
        } else {
            totals['Enrollment Maximum'] += parseInt(data[section]['Enrollment Maximum']);
        }
    }
    return totals;
}

// function formatCourseId(courseId: string): string {
//     // Remove spaces and ensure proper format (e.g., "CS 1301" becomes "CS1301")
//     return courseId.replace(/\s+/g, '');
// }

export async function fetchCourseData(courseName: string): Promise<CourseEnrollmentData> {
    const cachedData = courseDataCache.get(courseName);
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        return cachedData.data;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const currentTerm = month >= 8 ? `${year}08` : `${year}02`;
    const pastTerm = month >= 8 ? `${year}02` : `${year - 1}08`;
    const oneYearBack = month >= 8 ? `${year - 1}08` : `${year - 1}02`;
    const oneYearOneSemBack = month >= 8 ? `${year - 1}02` : `${year - 2}08`;

    try {
        const [currentTermData, pastTermData, oneYearBackTermData, oneYearOneSemBackTermData] = await Promise.all([
            termTotalEnrollment(currentTerm, courseName).catch(() => ({
                'Enrollment Actual': 0,
                'Enrollment Maximum': 0
            })),
            termTotalEnrollment(pastTerm, courseName).catch(() => ({
                'Enrollment Actual': 0,
                'Enrollment Maximum': 0
            })),
            termTotalEnrollment(oneYearBack, courseName).catch(() => ({
                'Enrollment Actual': 0,
                'Enrollment Maximum': 0
            })),
            termTotalEnrollment(oneYearOneSemBack, courseName).catch(() => ({
                'Enrollment Actual': 0,
                'Enrollment Maximum': 0
            }))
        ]);

        const data = {
            currentEnrollment: currentTermData['Enrollment Actual'],
            pastEnrollment: pastTermData['Enrollment Actual'],
            oneYearBackEnrollment: oneYearBackTermData['Enrollment Actual'],
            oneYearOneSemBackEnrollment: oneYearOneSemBackTermData['Enrollment Actual']

        };

        courseDataCache.set(courseName, {
            data,
            timestamp: Date.now()
        });

        return data;
    } catch (error) {
        console.error('Error fetching course data:', error);
        // Return default data instead of throwing
        return {
            currentEnrollment: 0,
            pastEnrollment: 0,
            oneYearBackEnrollment: 0,
            oneYearOneSemBackEnrollment: 0
        };
    }
} 