# Contributing to GradGT

Thank you for your interest in contributing to GradGT! This document provides guidelines and instructions for contributing to the project.

## What to Improve

There are many ways to contribute to GradGT, including:

- Adding new features
- Improving existing visualizations
- Fixing bugs
- Enhancing UI/UX
- Improving documentation
- Optimizing performance

Check out our [Issues tab](https://github.com/VineethSendilraj/GradGT/issues) for specific tasks that need attention.

## Project Structure

The project is built with Next.js and uses a modern React stack:

- `/src/app/` - Next.js app router pages and layouts
- `/src/components/` - React components
- `/src/lib/` - Utility functions and API handlers
- `/public/` - Static assets
- `/data/` - Course and prerequisite data

## Development Environment Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

We recommend using [Visual Studio Code](https://code.visualstudio.com/) with the following extensions:
- ESLint
- Prettier
- Tailwind CSS IntelliSense

### Getting Started

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/YourUsername/GradGT.git
cd GradGT
```

3. Install dependencies:
```bash
npm install
# or
yarn install
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Visit `http://localhost:3000` to see your changes

## Making Changes

1. Create a new branch for your feature/fix:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes
3. Test your changes thoroughly
4. Commit your changes with clear, descriptive messages
5. Push to your fork
6. Create a pull request

## Code Style

- Follow the existing code style
- Use TypeScript for type safety
- Use Tailwind CSS for styling
- Write clear comments for complex logic
- Keep components modular and reusable

## Before Submitting a Pull Request

1. Run linting:
```bash
npm run lint
```

2. Ensure all tests pass:
```bash
npm run test
```

3. Format your code:
```bash
npm run format
```

4. Update documentation if needed
5. Test your changes in both light and dark modes
6. Verify mobile responsiveness

## Creating a Pull Request

1. Go to the [GradGT repository](https://github.com/VineethSendilraj/GradGT)
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill in the PR template:
   - Clear title describing the change
   - Detailed description of changes
   - Reference any related issues
   - Add screenshots if applicable
   - List any breaking changes

## Need Help?

Feel free to reach out to the maintainers or open an issue if you need help or have questions. We're here to help! 