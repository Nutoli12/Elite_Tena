import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import axios from '../../lib/axios';
import { useAuth } from '../../contexts/AuthContext';

interface BookingWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface Department {
    id: string;
    name: string;
    icon: string;
    description: string;
}

interface Doctor {
    walletAddress: string;
    specialization: string;
    licenseNumber: string;
    rating?: number;
    profileData?: {
        fullName: string;
        bio?: string;
        experience?: string;
    };
}

interface TimeSlot {
    time: string;
    available: boolean;
}

const STEPS = [
    'Department',
    'Doctor',
    'Service Type',
    'Date & Time',
    'Medical Details',
    'Confirmation'
];

const DEPARTMENTS: Department[] = [
    { id: 'cardiology', name: 'Cardiology', icon: '❤️', description: 'Heart and cardiovascular care' },
    { id: 'dermatology', name: 'Dermatology', icon: '🧴', description: 'Skin, hair, and nail conditions' },
    { id: 'pediatrics', name: 'Pediatrics', icon: '👶', description: 'Child healthcare' },
    { id: 'orthopedics', name: 'Orthopedics', icon: '🦴', description: 'Bones, joints, and muscles' },
    { id: 'neurology', name: 'Neurology', icon: '🧠', description: 'Brain and nervous system' },
    { id: 'general', name: 'General Medicine', icon: '🏥', description: 'General health consultation' },
];

const SERVICE_TYPES = [
    {
        id: 'free_in_person',
        name: 'Free In-Person Consultation',
        description: 'Visit the hospital for a free consultation',
        icon: '🏥',
        price: 'Free',
        requiresApproval: false,
        serviceType: 'inPerson'
    },
    {
        id: 'paid_video',
        name: 'Paid Video Call',
        description: 'Online video consultation (requires doctor approval)',
        icon: '📹',
        price: 'Paid',
        requiresApproval: true,
        serviceType: 'videoCall'
    },
    {
        id: 'paid_chat',
        name: 'Paid Chat Consultation',
        description: 'Text-based consultation (requires doctor approval)',
        icon: '💬',
        price: 'Paid',
        requiresApproval: true,
        serviceType: 'chat'
    }
];

export const BookingWizard: React.FC<BookingWizardProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Form state
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [medicalDetails, setMedicalDetails] = useState({
        symptoms: '',
        duration: '',
        severity: 'moderate'
    });

    // Fetch doctors when department is selected
    useEffect(() => {
        if (selectedDepartment) {
            fetchDoctors(selectedDepartment.id);
        }
    }, [selectedDepartment]);

    // Fetch available slots when doctor and date are selected
    useEffect(() => {
        if (selectedDoctor && selectedDate) {
            fetchAvailableSlots();
        }
    }, [selectedDoctor, selectedDate]);

    const fetchDoctors = async (department: string) => {
        try {
            setLoading(true);
            const response = await axios.get(`/doctors?specialization=${department}`);
            setDoctors(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch doctors:', error);
            // Mock data for demo
            setDoctors([
                {
                    walletAddress: '0xdoctor1',
                    specialization: department,
                    licenseNumber: 'MD-12345',
                    rating: 4.8,
                    profileData: {
                        fullName: 'Dr. Alemayehu Tadesse',
                        bio: 'Experienced specialist with 10+ years',
                        experience: '10 years'
                    }
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableSlots = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/appointments/available-slots?doctorWallet=${selectedDoctor?.walletAddress}&date=${selectedDate}`);
            setAvailableSlots(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch slots:', error);
            // Mock slots
            const mockSlots = [
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
            ].map(time => ({ time, available: true }));
            setAvailableSlots(mockSlots);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);

            const appointmentData = {
                patientWalletAddress: user?.walletAddress,
                doctorWalletAddress: selectedDoctor?.walletAddress,
                appointmentDate: `${selectedDate}T${selectedTime}`,
                serviceType: selectedService.serviceType,
                requiresApproval: selectedService.requiresApproval,
                reason: medicalDetails.symptoms,
                duration: 30,
                fee: selectedService.requiresApproval ? 100 : 0,
                paymentStatus: selectedService.requiresApproval ? 'pending' : 'free',
                status: selectedService.requiresApproval ? 'scheduled' : 'scheduled',
                approvalStatus: selectedService.requiresApproval ? 'pending' : 'approved'
            };

            const response = await axios.post('/appointments', appointmentData);

            if (response.data.success) {
                onSuccess?.();
                onClose();
                // Show success message
                alert(selectedService.requiresApproval
                    ? 'Appointment request sent! Waiting for doctor approval.'
                    : 'Appointment confirmed!');
            }
        } catch (error: any) {
            console.error('Failed to book appointment:', error);
            alert(error.response?.data?.message || 'Failed to book appointment');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 0: return selectedDepartment !== null;
            case 1: return selectedDoctor !== null;
            case 2: return selectedService !== null;
            case 3: return selectedDate !== '' && selectedTime !== '';
            case 4: return medicalDetails.symptoms.trim() !== '';
            default: return true;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-medical-500 to-medical-600 px-6 py-4 text-white">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Book Appointment</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Progress Steps */}
                        <div className="mt-4 flex items-center justify-between">
                            {STEPS.map((step, index) => (
                                <div key={step} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index <= currentStep ? 'bg-white text-medical-600' : 'bg-medical-400 text-white'
                                            }`}>
                                            {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                                        </div>
                                        <span className="text-xs mt-1 hidden md:block">{step}</span>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className={`h-1 flex-1 mx-2 ${index < currentStep ? 'bg-white' : 'bg-medical-400'
                                            }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
                        <AnimatePresence mode="wait">
                            {/* Step 1: Select Department */}
                            {currentStep === 0 && (
                                <motion.div
                                    key="department"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <h3 className="text-xl font-bold mb-4">Select Department</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {DEPARTMENTS.map((dept) => (
                                            <motion.button
                                                key={dept.id}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setSelectedDepartment(dept)}
                                                className={`p-4 rounded-xl border-2 transition-all ${selectedDepartment?.id === dept.id
                                                        ? 'border-medical-500 bg-medical-50'
                                                        : 'border-gray-200 hover:border-medical-300'
                                                    }`}
                                            >
                                                <div className="text-4xl mb-2">{dept.icon}</div>
                                                <div className="font-semibold text-gray-900">{dept.name}</div>
                                                <div className="text-xs text-gray-600 mt-1">{dept.description}</div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 2: Select Doctor */}
                            {currentStep === 1 && (
                                <motion.div
                                    key="doctor"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <h3 className="text-xl font-bold mb-4">Select Doctor</h3>
                                    {loading ? (
                                        <div className="text-center py-8">Loading doctors...</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {doctors.map((doctor) => (
                                                <motion.button
                                                    key={doctor.walletAddress}
                                                    whileHover={{ scale: 1.02 }}
                                                    onClick={() => setSelectedDoctor(doctor)}
                                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedDoctor?.walletAddress === doctor.walletAddress
                                                            ? 'border-medical-500 bg-medical-50'
                                                            : 'border-gray-200 hover:border-medical-300'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h4 className="font-bold text-lg">{doctor.profileData?.fullName}</h4>
                                                            <p className="text-sm text-gray-600">{doctor.specialization}</p>
                                                            <p className="text-xs text-gray-500 mt-1">{doctor.profileData?.bio}</p>
                                                        </div>
                                                        {doctor.rating && (
                                                            <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg">
                                                                <span className="text-yellow-600">⭐</span>
                                                                <span className="font-bold text-yellow-700">{doctor.rating}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Step 3: Select Service Type */}
                            {currentStep === 2 && (
                                <motion.div
                                    key="service"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <h3 className="text-xl font-bold mb-4">Select Service Type</h3>
                                    <div className="space-y-4">
                                        {SERVICE_TYPES.map((service) => (
                                            <motion.button
                                                key={service.id}
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => setSelectedService(service)}
                                                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedService?.id === service.id
                                                        ? 'border-medical-500 bg-medical-50'
                                                        : 'border-gray-200 hover:border-medical-300'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="text-4xl">{service.icon}</div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-bold text-lg">{service.name}</h4>
                                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${service.price === 'Free' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                {service.price}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                                                        {service.requiresApproval && (
                                                            <p className="text-xs text-yellow-600 mt-2">⚠️ Requires doctor approval</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 4: Select Date & Time */}
                            {currentStep === 3 && (
                                <motion.div
                                    key="datetime"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <h3 className="text-xl font-bold mb-4">Select Date & Time</h3>

                                    {/* Date Picker */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Date
                                        </label>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Time Slots */}
                                    {selectedDate && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Available Time Slots
                                            </label>
                                            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                                {availableSlots.map((slot) => (
                                                    <motion.button
                                                        key={slot.time}
                                                        whileHover={slot.available ? { scale: 1.05 } : {}}
                                                        whileTap={slot.available ? { scale: 0.95 } : {}}
                                                        onClick={() => slot.available && setSelectedTime(slot.time)}
                                                        disabled={!slot.available}
                                                        className={`py-3 rounded-lg font-medium transition-all ${selectedTime === slot.time
                                                                ? 'bg-medical-500 text-white'
                                                                : slot.available
                                                                    ? 'bg-gray-100 hover:bg-medical-100 text-gray-900'
                                                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        {slot.time}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Step 5: Medical Details */}
                            {currentStep === 4 && (
                                <motion.div
                                    key="details"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <h3 className="text-xl font-bold mb-4">Medical Details</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Symptoms / Reason for Visit *
                                            </label>
                                            <textarea
                                                value={medicalDetails.symptoms}
                                                onChange={(e) => setMedicalDetails({ ...medicalDetails, symptoms: e.target.value })}
                                                rows={4}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                                                placeholder="Describe your symptoms or reason for consultation..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Duration of Symptoms
                                            </label>
                                            <select
                                                value={medicalDetails.duration}
                                                onChange={(e) => setMedicalDetails({ ...medicalDetails, duration: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                                            >
                                                <option value="">Select duration</option>
                                                <option value="1-2 days">1-2 days</option>
                                                <option value="3-7 days">3-7 days</option>
                                                <option value="1-2 weeks">1-2 weeks</option>
                                                <option value="2-4 weeks">2-4 weeks</option>
                                                <option value="1+ months">1+ months</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Severity
                                            </label>
                                            <div className="flex gap-3">
                                                {['mild', 'moderate', 'severe'].map((severity) => (
                                                    <button
                                                        key={severity}
                                                        onClick={() => setMedicalDetails({ ...medicalDetails, severity })}
                                                        className={`flex-1 py-3 rounded-xl font-medium transition-all ${medicalDetails.severity === severity
                                                                ? 'bg-medical-500 text-white'
                                                                : 'bg-gray-100 hover:bg-medical-100 text-gray-900'
                                                            }`}
                                                    >
                                                        {severity.charAt(0).toUpperCase() + severity.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 6: Confirmation */}
                            {currentStep === 5 && (
                                <motion.div
                                    key="confirmation"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <h3 className="text-xl font-bold mb-4">Confirm Appointment</h3>

                                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Department</p>
                                            <p className="font-semibold">{selectedDepartment?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Doctor</p>
                                            <p className="font-semibold">{selectedDoctor?.profileData?.fullName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Service Type</p>
                                            <p className="font-semibold">{selectedService?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Date & Time</p>
                                            <p className="font-semibold">{selectedDate} at {selectedTime}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Symptoms</p>
                                            <p className="font-semibold">{medicalDetails.symptoms}</p>
                                        </div>

                                        {selectedService?.requiresApproval && (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                                                <p className="text-sm text-yellow-800">
                                                    ⚠️ This appointment requires doctor approval. You will be notified once the doctor reviews your request.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Back
                        </button>

                        {currentStep < STEPS.length - 1 ? (
                            <button
                                onClick={nextStep}
                                disabled={!canProceed()}
                                className="flex items-center gap-2 px-6 py-3 bg-medical-500 text-white rounded-xl hover:bg-medical-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Booking...' : 'Confirm Booking'}
                                <Check className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
