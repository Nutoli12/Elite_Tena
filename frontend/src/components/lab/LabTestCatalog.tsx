import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { labWorkflowAPI, type LabTest } from '../../services/labWorkflowApi';
import { 
  BeakerIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const LabTestCatalog: React.FC = () => {
  const { theme } = useTheme();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [groupedTests, setGroupedTests] = useState<Record<string, LabTest[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    loadTestCatalog();
  }, [searchTerm, selectedCategory]);

  const loadTestCatalog = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;

      const response = await labWorkflowAPI.getLabTestCatalog(params);
      setTests(response.data.tests);
      setGroupedTests(response.data.groupedTests);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error loading test catalog:', error);
      toast.error('Failed to load test catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSelection = (testCode: string) => {
    setSelectedTests(prev => 
      prev.includes(testCode) 
        ? prev.filter(code => code !== testCode)
        : [...prev, testCode]
    );
  };

  const calculateSelectedTests = async () => {
    if (selectedTests.length === 0) {
      toast.error('Please select at least one test');
      return;
    }

    try {
      const response = await labWorkflowAPI.getTestDetails(selectedTests);
      const { totalPrice, estimatedTime } = response.data;
      
      toast.success(
        `Selected Tests: ${selectedTests.length}\nTotal Cost: $${totalPrice}\nEstimated Time: ${estimatedTime} hours`,
        { duration: 5000 }
      );
      setShowCalculator(true);
    } catch (error) {
      console.error('Error calculating tests:', error);
      toast.error('Failed to calculate test details');
    }
  };

  const getPriorityColor = (hours: number) => {
    if (hours <= 4) return 'text-green-600 bg-green-100';
    if (hours <= 12) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSampleTypeIcon = (sampleType: string) => {
    switch (sampleType.toLowerCase()) {
      case 'blood':
        return '🩸';
      case 'urine':
        return '🧪';
      case 'stool':
        return '💩';
      default:
        return '🔬';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Lab Test Catalog
        </h2>
        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Browse available laboratory tests with pricing and turnaround times
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
        
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`pl-10 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {selectedTests.length > 0 && (
          <button
            onClick={calculateSelectedTests}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            Calculate ({selectedTests.length})
          </button>
        )}
      </div>

      {/* Test Categories */}
      {Object.keys(groupedTests).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedTests).map(([category, categoryTests]) => (
            <div key={category}>
              <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {category}
              </h3>
              <div className="grid gap-4">
                {categoryTests.map((test) => (
                  <div
                    key={test.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedTests.includes(test.testCode)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => handleTestSelection(test.testCode)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-2xl mr-3">
                            {getSampleTypeIcon(test.sampleType)}
                          </span>
                          <div>
                            <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {test.testName} ({test.testCode})
                            </h4>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {test.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            theme === 'dark' ? 'bg-gray-600 text-gray-200' : 'bg-gray-100 text-gray-700'
                          }`}>
                            Sample: {test.sampleType}
                          </span>
                          
                          {test.fastingRequired && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              Fasting Required
                            </span>
                          )}
                          
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(test.turnaroundTimeHours)}`}>
                            <ClockIcon className="h-3 w-3 inline mr-1" />
                            {test.turnaroundTimeHours}h
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          ${test.standardPrice}
                        </div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          per test
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
            No tests found
          </h3>
          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {/* Selected Tests Summary */}
      {selectedTests.length > 0 && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
          theme === 'dark' ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'
        }`}>
          <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Selected Tests: {selectedTests.length}
          </div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            {selectedTests.join(', ')}
          </div>
          <button
            onClick={() => setSelectedTests([])}
            className="mt-2 text-xs text-red-600 hover:text-red-800"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default LabTestCatalog;