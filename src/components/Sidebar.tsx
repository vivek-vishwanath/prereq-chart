import React from 'react';
import Thread from './PreReqChart'

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  filters: Thread[];
  onFilterChange: (key: Thread) => void;
}

const Sidebar = ({ isOpen, onClose, darkMode, filters, onFilterChange }: SidebarProps) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-16 bottom-16 w-64 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              Thread Filters
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
              aria-label="Close sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Thread Visibility
              </h3>
              <div className="space-y-3">
                {filters.map((filter) => (
                    filter.name !== "required" &&
                    <label className="flex items-center space-x-3 cursor-pointer" key={filter.name}>
                      <input
                          type="checkbox"
                          checked={filter.show}
                          onChange={() => onFilterChange(filter.name)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className={`${darkMode ? 'text-gray-200' : 'text-gray-600'}`}>
                    {filter.formalName}
                  </span>
                    </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 