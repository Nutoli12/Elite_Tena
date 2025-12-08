import React from 'react';
import { Calendar, BookOpen } from 'lucide-react';

interface FollowUpEducationPhaseProps {
  data: any;
  onUpdate: (field: string, value: any) => void;
}

export const FollowUpEducationPhase: React.FC<FollowUpEducationPhaseProps> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      {/* Follow-up Schedule */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-medical-600" />
          Follow-up Schedule
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">In-Hospital Follow-up</label>
            <input
              type="text"
              value={data.followUpSchedule?.inHospital || ''}
              onChange={(e) => onUpdate('followUpSchedule', { ...data.followUpSchedule, inHospital: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="e.g., Daily rounds in CCU"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Post-Discharge Follow-up</label>
            <input
              type="text"
              value={data.followUpSchedule?.postDischarge || ''}
              onChange={(e) => onUpdate('followUpSchedule', { ...data.followUpSchedule, postDischarge: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="e.g., Cardiology clinic in 1 week"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Care Follow-up</label>
            <input
              type="text"
              value={data.followUpSchedule?.primaryCare || ''}
              onChange={(e) => onUpdate('followUpSchedule', { ...data.followUpSchedule, primaryCare: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
              placeholder="e.g., 2 weeks for medication adjustment"
            />
          </div>
        </div>
      </div>

      {/* Patient Education */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-medical-600" />
          Patient Education
        </h2>
        <div className="space-y-3">
          {[
            'Chest pain action plan',
            'Medication purpose and timing',
            'Diet and lifestyle modifications',
            'Warning signs to watch for',
            'Smoking cessation counseling',
            'Exercise recommendations',
            'Stress management'
          ].map((topic) => (
            <label key={topic} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={(data.patientEducation || []).includes(topic)}
                onChange={(e) => {
                  const current = data.patientEducation || [];
                  if (e.target.checked) {
                    onUpdate('patientEducation', [...current, topic]);
                  } else {
                    onUpdate('patientEducation', current.filter((t: string) => t !== topic));
                  }
                }}
                className="w-4 h-4 text-medical-600 rounded focus:ring-medical-500"
              />
              <span className="text-gray-700">{topic}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Educational Materials Provided */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Educational Materials Provided</h2>
        <textarea
          value={(data.educationMaterialsProvided || []).join('\n')}
          onChange={(e) => onUpdate('educationMaterialsProvided', e.target.value.split('\n').filter(Boolean))}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500"
          placeholder="Enter materials provided (one per line)&#10;• American Heart Association brochures&#10;• Medication information sheets&#10;• Cardiac diet guidelines"
        />
      </div>
    </div>
  );
};
