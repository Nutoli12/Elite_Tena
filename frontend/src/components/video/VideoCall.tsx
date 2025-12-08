import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone } from 'lucide-react';

interface VideoCallProps {
    otherUserWallet: string;
    isInitiator?: boolean;
    onEndCall: () => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({
    otherUserWallet,
    isInitiator = false,
    onEndCall
}) => {
    const { socket } = useSocket();
    const { user } = useAuth();

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [incomingCall, setIncomingCall] = useState<any>(null);

    const myVideo = useRef<HTMLVideoElement>(null);
    const userVideo = useRef<HTMLVideoElement>(null);
    const connectionRef = useRef<RTCPeerConnection | null>(null);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }
            })
            .catch(err => console.error('Failed to get local stream:', err));

        if (socket) {
            socket.on('call_user', (data) => {
                console.log('📞 Incoming call from:', data.from);
                setIncomingCall(data);
            });

            socket.on('call_accepted', (signal) => {
                console.log('✅ Call accepted');
                setCallAccepted(true);
                connectionRef.current?.setRemoteDescription(new RTCSessionDescription(signal));
            });

            socket.on('call_ended', () => {
                console.log('❌ Call ended');
                setCallEnded(true);
                cleanup();
                onEndCall();
            });

            socket.on('ice_candidate', (candidate) => {
                connectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
            });
        }

        return () => {
            cleanup();
        };
    }, [socket]);

    const cleanup = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (connectionRef.current) {
            connectionRef.current.close();
        }
    };

    const createPeerConnection = () => {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });

        peer.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('ice_candidate', {
                    to: otherUserWallet,
                    candidate: event.candidate
                });
            }
        };

        peer.ontrack = (event) => {
            if (userVideo.current) {
                userVideo.current.srcObject = event.streams[0];
            }
        };

        if (stream) {
            stream.getTracks().forEach(track => peer.addTrack(track, stream));
        }

        connectionRef.current = peer;
        return peer;
    };

    const callUser = async () => {
        const peer = createPeerConnection();

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        if (socket && user) {
            socket.emit('call_user', {
                userToCall: otherUserWallet,
                signalData: offer,
                from: user.walletAddress,
                name: user.fullName
            });
        }
    };

    const answerCall = async () => {
        setCallAccepted(true);
        const peer = createPeerConnection();

        await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        if (socket) {
            socket.emit('answer_call', {
                signal: answer,
                to: incomingCall.from
            });
        }
    };

    const leaveCall = () => {
        setCallEnded(true);
        if (socket) {
            socket.emit('end_call', { to: otherUserWallet });
        }
        cleanup();
        onEndCall();
    };

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
            setIsVideoOff(!isVideoOff);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-2xl overflow-hidden relative">
            <div className="flex-1 relative">
                {/* Remote Video */}
                {callAccepted && !callEnded ? (
                    <video
                        playsInline
                        ref={userVideo}
                        autoPlay
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                        {incomingCall && !callAccepted ? (
                            <div className="text-center">
                                <p className="text-xl mb-4">{incomingCall.name || 'Unknown'} is calling...</p>
                                <button
                                    onClick={answerCall}
                                    className="bg-green-500 text-white px-8 py-3 rounded-full font-bold animate-pulse"
                                >
                                    Answer Call
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-gray-400 mb-4">Waiting for connection...</p>
                                {!incomingCall && (
                                    <button
                                        onClick={callUser}
                                        className="bg-medical-600 text-white px-6 py-2 rounded-full"
                                    >
                                        Start Call
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Local Video (Picture in Picture) */}
                {stream && (
                    <div className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-xl overflow-hidden shadow-lg border-2 border-gray-800">
                        <video
                            playsInline
                            muted
                            ref={myVideo}
                            autoPlay
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-gray-800 p-4 flex justify-center gap-6">
                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-600'} hover:opacity-80 transition-all`}
                >
                    {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                </button>

                <button
                    onClick={leaveCall}
                    className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all"
                >
                    <PhoneOff className="w-6 h-6 text-white" />
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-600'} hover:opacity-80 transition-all`}
                >
                    {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                </button>
            </div>
        </div>
    );
};
