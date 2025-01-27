import React from 'react';

interface OnboardingModalProps {
  darkMode: boolean;
  onClose: () => void;
}

const OnboardingModal = ({ darkMode, onClose }: OnboardingModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg mx-4 ${
        darkMode ? 'text-gray-100' : 'text-gray-900'
      }`}>
        <h2 className="text-2xl font-bold mb-4">Welcome to GradGT - CS</h2>
        <div className="space-y-4">
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
            This interactive flowchart helps you understand course prerequisites at Georgia Tech.
          </p>
          <div className="space-y-2">
            <h3 className="font-semibold">How to use:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click on any course box to view enrollment data</li>
              <li>Use the zoom controls to adjust the view</li>
              <li>Drag the chart to pan around</li>
              <li>Follow the arrows to understand prerequisites</li>
              <li>Toggle dark mode for better viewing at night</li>
              <li>Use the sidebar to filter course threads</li>
            </ul>
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Note: Diamond shapes represent AND/OR logic for prerequisites
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors w-full"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal; 