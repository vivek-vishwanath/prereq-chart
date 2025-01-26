# GradGT - Georgia Tech Course Prerequisites Visualization

An interactive visualization tool for exploring course prerequisites at Georgia Tech's School of Computing. This tool helps students better understand course dependencies and plan their academic journey.

## Features

- **Interactive Course Map**: Visual representation of course prerequisites and their relationships
- **Real-time Enrollment Data**: View current and past semester enrollment statistics for each course
- **Dark/Light Mode**: Toggle between dark and light themes for comfortable viewing
- **Zoom & Pan**: Easily navigate through the course map
- **Course Categories**:
  - Required Courses (Amber)
  - Intelligence Courses (Emerald)
  - Information Courses (Orange)
- **AND/OR Logic**: Diamond shapes represent prerequisite logic gates

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/VineethSendilraj/GradGT.git
cd GradGT
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

- **View Course Details**: Click on any course box to view enrollment data
- **Navigation**: 
  - Drag to pan around the chart
  - Use mouse wheel or zoom controls to zoom in/out
  - Click the reset button to return to the default view
- **Theme**: Toggle between dark and light modes using the theme button in the header

## Built With

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [GT Scheduler API](https://gt-scheduler.github.io/) - Course data

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Authors

- [Vineeth Sendilraj](https://www.linkedin.com/in/vineethsendilraj/)
- [Vivek](https://www.linkedin.com/in/vivek/)
- [Daveh Day](https://www.linkedin.com/in/daveh-day/)

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Acknowledgments

- Georgia Institute of Technology
- GT Scheduler Team for their API
- School of Computing for course data
