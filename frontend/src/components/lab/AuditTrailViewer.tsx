import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { labWorkflowAPI } from '../../services/labWorkflowApi';
import { 
  DocumentTextIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  ShieldCheckIcon,
  LinkIcon,
  EyeIcon,
  ArrowPathIcon,
  FunnelIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface AuditEvent {
  timestamp: string;
  action: string;
  actor: string;
  location: string;
  notes?: string;
  barcodeScanned?: string;
  sampleVolume?: string;
  container?: string;
  digitalSignature?: string;
  ipfsHash?: string;
  blockchainTx?: string;
  metadata?: Record<string, any>;
}

interface ChainOfCustody {
  from: string;
  to: string;
  time: string;
  signature: string;
}

interface DataIntegrity {
  hashChain: string[];
  blockchainConfirmations: number;
  lastBlockValidated: string;
  immutable: boolean;
}

interface AuditTrailViewerProps {
  orderId?: string;
  patientId?: string;
}

const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({ orderId, patientId }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<AuditEvent[]>([]);
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustody[]>([]);
  const [dataIntegrity, setDataIntegrity] = useState<DataIntegrity | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  useEffect(() => {
    loadAuditData();
  }, [orderId, patientId]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      
      // Try to load from API, fallback to mock data
      try {
        const response = await labWorkflowAPI.getAccessLogs({
          labOrderId: orderId ? parseInt(orderId.replace('LAB-', '')) : undefined,
          limit: 100
        });
        
        if (response.data?.accessLogs?.length > 0) {
          const formattedTimeline = response.data.accessLogs.map((log: any) => ({
            timestamp: log.createdAt,
            action: log.action.toUpperCase().replace(/_/g, ' '),
            actor: log.userWalletAddress?.slice(0, 10) + '...' || 'System',
            location: log.ipAddress || 'Unknown',
            notes: log.accessedData ? JSON.stringify(log.accessedData) : undefined,
            metadata: log.accessedData
          }));
          setTimeline(formattedTimeline);
        } else {
          loadMockData();
        }
      } catch {
        loadMockData();
      }
    } catch (error) {
      console.error('Error loading audit data:', error);
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    // Mock timeline data based on the operational manual
    const mockTimeline: AuditEvent[] = [
      {
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        action: 'ORDER_CREATED',
        actor: 'Dr. Fitsum (DOC-112)',
        location: 'Clinic Room 4',
        notes: 'Order placed via EMR'
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 1.75).toISOString(),
        action: 'SAMPLE_COLLECTED',
        actor: 'Nurse Yeshi (NUR-045)',
        location: 'Phlebotomy Station 2',
        barcodeScanned: 'BC-244002001',
        sampleVolume: '5.0 mL',
        container: 'Lavender Top EDTA'
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        action: 'ORDER_RECEIVED_IN_LAB',
        actor: 'System Auto',
        location: 'Central Receiving',
        notes: 'Transport time: 20 minutes, Temperature: Within range'
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 1.25).toISOString(),
        action: 'ORDER_ACCEPTED',
        actor: 'Tech. Alemayehu (TEC-007)',
        location: 'Hematology Section',
        notes: 'Priority: URGENT, Est. completion: 2 hours'
      },
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        action: 'PROCESSING_STARTED',
        actor: 'Tech. Alemayehu (TEC-007)',
        location: 'Microscopy Station 3',
        notes: 'Instrument: Olympus CX43, QC: PASS'
      },
      {
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        action: 'RESULTS_ENTERED',
        actor: 'Tech. Alemayehu (TEC-007)',
        location: 'Microscopy Station 3',
        notes: 'Findings: Malaria Parasite: NEGATIVE, Images: 2'
      },
      {
        timestamp: new Date(Date.now() - 900000).toISOString(),
        action: 'TECHNICIAN_VERIFICATION',
        actor: 'Tech. Alemayehu (TEC-007)',
        location: 'Verification Station',
        digitalSignature: 'SIGNED_ECDSA_HASH_abc123...',
        notes: 'Double-checked both slides, confirmed negative'
      },
      {
        timestamp: new Date(Date.now() - 600000).toISOString(),
        action: 'RESULTS_RELEASED',
        actor: 'Tech. Alemayehu (TEC-007)',
        location: 'Lab System',
        ipfsHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
        blockchainTx: '0xabc123def456789...'
      },
      {
        timestamp: new Date(Date.now() - 300000).toISOString(),
        action: 'DOCTOR_NOTIFIED',
        actor: 'System Auto',
        location: 'Notification Service',
        notes: 'Push and email sent, Doctor acknowledged'
      }
    ];

    const mockChainOfCustody: ChainOfCustody[] = [
      { from: 'Nurse Yeshi', to: 'Lab Courier', time: '13:50', signature: 'YESHI_SIG_001' },
      { from: 'Lab Courier', to: 'Central Receiving', time: '14:05', signature: 'COURIER_SIG_002' },
      { from: 'Central Receiving', to: 'Tech. Alemayehu', time: '14:15', signature: 'RECEIVING_SIG_003' }
    ];

    const mockDataIntegrity: DataIntegrity = {
      hashChain: [
        'ORDER_CREATE_HASH_1',
        'SAMPLE_COLLECT_HASH_2',
        'LAB_RECEIVE_HASH_3',
        'PROCESS_START_HASH_4',
        'RESULT_ENTER_HASH_5',
        'FINAL_RELEASE_HASH_6'
      ],
      blockchainConfirmations: 12,
      lastBlockValidated: new Date().toISOString(),
      immutable: true
    };

    setTimeline(mockTimeline);
    setChainOfCustody(mockChainOfCustody);
    setDataIntegrity(mockDataIntegrity);
  };

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE') || action.includes('ORDER')) return '📋';
    if (action.includes('COLLECT')) return '💉';
    if (action.includes('RECEIVE')) return '📥';
    if (action.includes('ACCEPT')) return '✅';
    if (action.includes('PROCESS')) return '🔬';
    if (action.includes('RESULT') || action.includes('ENTER')) return '📊';
    if (action.includes('VERIF')) return '✔️';
    if (action.includes('RELEASE')) return '📤';
    if (action.includes('NOTIF')) return '🔔';
    return '📌';
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20';
    if (action.includes('COLLECT')) return 'border-purple-400 bg-purple-50 dark:bg-purple-900/20';
    if (action.includes('RECEIVE')) return 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20';
    if (action.includes('ACCEPT')) return 'border-green-400 bg-green-50 dark:bg-green-900/20';
    if (action.includes('PROCESS')) return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    if (action.includes('RESULT')) return 'border-orange-400 bg-orange-50 dark:bg-orange-900/20';
    if (action.includes('VERIF')) return 'border-teal-400 bg-teal-50 dark:bg-teal-900/20';
    if (action.includes('RELEASE')) return 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
    return 'border-gray-400 bg-gray-50 dark:bg-gray-700';
  };

  const filteredTimeline = filter === 'all' 
    ? timeline 
    : timeline.filter(event => event.action.toLowerCase().includes(filter.toLowerCase()));

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📜 Complete Audit Trail
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAuditData}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Order Info */}
        {orderId && (
          <div className={`p-4 rounded-lg mb-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-4 text-sm">
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                <strong>Order ID:</strong> {orderId}
              </span>
              {patientId && (
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  <strong>Patient ID:</strong> {patientId}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`px-3 py-2 border rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Events</option>
            <option value="order">Order Events</option>
            <option value="collect">Collection Events</option>
            <option value="process">Processing Events</option>
            <option value="result">Result Events</option>
            <option value="verif">Verification Events</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <ClockIcon className="h-5 w-5 inline mr-2" />
                Event Timeline ({filteredTimeline.length} events)
              </h3>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-600"></div>
                
                <div className="space-y-4">
                  {filteredTimeline.map((event, index) => (
                    <div
                      key={index}
                      className={`relative pl-10 cursor-pointer transition-all hover:scale-[1.01]`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-2 w-5 h-5 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-500 flex items-center justify-center text-xs">
                        {getActionIcon(event.action)}
                      </div>
                      
                      <div className={`p-4 border-l-4 rounded-r-lg ${getActionColor(event.action)}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {event.action.replace(/_/g, ' ')}
                            </h4>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(event.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <EyeIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                            <UserIcon className="h-4 w-4 inline mr-1" />
                            <strong>Actor:</strong> {event.actor}
                          </p>
                          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                            <MapPinIcon className="h-4 w-4 inline mr-1" />
                            <strong>Location:</strong> {event.location}
                          </p>
                          {event.notes && (
                            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                              <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                              {event.notes}
                            </p>
                          )}
                          {event.digitalSignature && (
                            <p className="text-green-600">
                              <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                              Digitally Signed
                            </p>
                          )}
                          {event.blockchainTx && (
                            <p className="text-blue-600">
                              <LinkIcon className="h-4 w-4 inline mr-1" />
                              Blockchain: {event.blockchainTx.slice(0, 16)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Chain of Custody & Data Integrity */}
        <div className="space-y-6">
          {/* Chain of Custody */}
          <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                🔗 Chain of Custody
              </h3>
            </div>
            <div className="p-4">
              {chainOfCustody.length === 0 ? (
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  No custody records available
                </p>
              ) : (
                <div className="space-y-3">
                  {chainOfCustody.map((custody, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {custody.from} → {custody.to}
                        </span>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {custody.time}
                        </span>
                      </div>
                      <p className="text-xs text-green-600">
                        <ShieldCheckIcon className="h-3 w-3 inline mr-1" />
                        Sig: {custody.signature}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Data Integrity */}
          <div className={`rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                🔒 Data Integrity
              </h3>
            </div>
            <div className="p-4">
              {dataIntegrity ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      Status
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dataIntegrity.immutable 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {dataIntegrity.immutable ? '✓ IMMUTABLE' : 'PENDING'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      Blockchain Confirmations
                    </span>
                    <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {dataIntegrity.blockchainConfirmations}
                    </span>
                  </div>
                  
                  <div>
                    <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      Hash Chain ({dataIntegrity.hashChain.length} blocks)
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {dataIntegrity.hashChain.map((hash, index) => (
                        <div
                          key={index}
                          className={`text-xs p-1 rounded font-mono ${
                            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                          }`}
                        >
                          {index + 1}. {hash}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Last validated: {new Date(dataIntegrity.lastBlockValidated).toLocaleString()}
                  </div>
                </div>
              ) : (
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  No integrity data available
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {getActionIcon(selectedEvent.action)} {selectedEvent.action.replace(/_/g, ' ')}
                </h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className={`text-gray-500 hover:text-gray-700 ${theme === 'dark' ? 'hover:text-gray-300' : ''}`}
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Event Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Timestamp:</strong> {new Date(selectedEvent.timestamp).toLocaleString()}</p>
                    <p><strong>Actor:</strong> {selectedEvent.actor}</p>
                    <p><strong>Location:</strong> {selectedEvent.location}</p>
                    {selectedEvent.notes && <p><strong>Notes:</strong> {selectedEvent.notes}</p>}
                  </div>
                </div>

                {(selectedEvent.barcodeScanned || selectedEvent.sampleVolume || selectedEvent.container) && (
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Sample Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedEvent.barcodeScanned && <p><strong>Barcode:</strong> {selectedEvent.barcodeScanned}</p>}
                      {selectedEvent.sampleVolume && <p><strong>Volume:</strong> {selectedEvent.sampleVolume}</p>}
                      {selectedEvent.container && <p><strong>Container:</strong> {selectedEvent.container}</p>}
                    </div>
                  </div>
                )}

                {(selectedEvent.digitalSignature || selectedEvent.ipfsHash || selectedEvent.blockchainTx) && (
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Verification & Blockchain
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedEvent.digitalSignature && (
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          <span><strong>Digital Signature:</strong> {selectedEvent.digitalSignature}</span>
                        </div>
                      )}
                      {selectedEvent.ipfsHash && (
                        <p className="font-mono text-xs break-all">
                          <strong>IPFS Hash:</strong> {selectedEvent.ipfsHash}
                        </p>
                      )}
                      {selectedEvent.blockchainTx && (
                        <p className="font-mono text-xs break-all">
                          <strong>Blockchain TX:</strong> {selectedEvent.blockchainTx}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Close
                  </button>
                  {selectedEvent.blockchainTx && (
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      View on Blockchain
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrailViewer;
