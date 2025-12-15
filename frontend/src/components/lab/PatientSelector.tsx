import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { labWorkflowAPI } from '../../services/labWorkflowApi';
import { 
  UserIcon, 
  MagnifyingGlassIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface Patient {
  walletAddress: string;
  email: string;
  fullName: string;
  phone?: string;
  displayName: string;
  searchText: string;
}

interface PatientSelectorProps {
  selectedPatient?: Patient | null;
  onPatientSelect: (patient: Patient | null) => void;
  placeholder?: string;
  required?: boolean;
}

const PatientSelector: React.FC<PatientSelectorProps> = ({
  selectedPatient,
  onPatientSelect,
  placeholder = "Search and select a patient...",
  required = false
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    // Filter patients based on search term
    if (searchTerm.trim()) {
      const filtered = patients.filter(patient =>
        patient.searchText.includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients.slice(0, 10)); // Show first 10 by default
    }
  }, [searchTerm, patients]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await labWorkflowAPI.getPatients({ limit: 100 });
      console.log('Patient API response:', response); // Debug log
      
      // Handle the nested data structure: response.data.data.patients
      const patients = response.data?.patients || response.data?.data?.patients || [];
      console.log('Extracted patients:', patients); // Debug log
      
      setPatients(patients);
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]); // Ensure empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    onPatientSelect(patient);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    onPatientSelect(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
        Patient {required && <span className="text-red-500">*</span>}
      </label>
      
      {/* Selected Patient Display / Trigger */}
      <div
        onClick={handleDropdownToggle}
        className={`w-full px-3 py-2 border rounded-lg cursor-pointer transition-all ${
          theme === 'dark' 
            ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
        } ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <UserIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
            {selectedPatient ? (
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {selectedPatient.fullName}
                </div>
                <div className={`text-sm truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedPatient.walletAddress.slice(0, 10)}...{selectedPatient.walletAddress.slice(-6)}
                </div>
              </div>
            ) : (
              <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {placeholder}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {selectedPatient && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSelection();
                }}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                ×
              </button>
            )}
            <ChevronDownIcon 
              className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 border rounded-lg shadow-lg ${
          theme === 'dark' 
            ? 'bg-gray-700 border-gray-600' 
            : 'bg-white border-gray-300'
        }`}>
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by name, email, or wallet address..."
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'dark' 
                    ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>

          {/* Patient List */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Loading patients...
                </div>
              </div>
            ) : filteredPatients.length > 0 ? (
              <div className="py-1">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.walletAddress}
                    onClick={() => handlePatientSelect(patient)}
                    className={`px-3 py-2 cursor-pointer transition-colors ${
                      selectedPatient?.walletAddress === patient.walletAddress
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : theme === 'dark'
                        ? 'hover:bg-gray-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {patient.fullName}
                        </div>
                        <div className={`text-sm truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {patient.email}
                        </div>
                        <div className={`text-xs truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {patient.walletAddress}
                        </div>
                      </div>
                      {selectedPatient?.walletAddress === patient.walletAddress && (
                        <CheckIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {searchTerm ? 'No patients found matching your search.' : 'No patients available.'}
                </div>
              </div>
            )}
          </div>

          {/* Add New Patient Option */}
          <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Can't find the patient? Make sure they have registered in the system first.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientSelector;