// Persona and course data for Library Link extension

const PERSONA_DATA = {
    // Default persona
    defaultPersona: 'student',

    // Professor profile (dummy data)
    professorProfile: {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@nyu.edu',
        department: 'Computer Science',
        courses: [
            {
                code: 'CS101',
                name: 'Introduction to Computer Science',
                semester: 'Fall 2025',
                section: '001'
            },
            {
                code: 'CS201',
                name: 'Data Structures and Algorithms',
                semester: 'Fall 2025',
                section: '002'
            },
            {
                code: 'CS301',
                name: 'Software Engineering',
                semester: 'Fall 2025',
                section: '001'
            }
        ]
    }
};

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PERSONA_DATA;
}
