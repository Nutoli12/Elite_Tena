import { Server } from 'socket.io';
import db from '../models/index.js';

let io;
const userSockets = new Map(); // Map wallet address -> socket ID

export const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
        pingTimeout: 60000,
        pingInterval: 25000
    });

    io.on('connection', (socket) => {
        console.log('🔌 New client connected:', socket.id);

        // User authentication/identification
        socket.on('identify', (walletAddress) => {
            if (walletAddress) {
                const normalizedWallet = walletAddress.toLowerCase();
                userSockets.set(normalizedWallet, socket.id);
                socket.join(normalizedWallet); // Join a room with their wallet address
                console.log(`👤 User identified: ${normalizedWallet} (${socket.id})`);
            }
        });

        // Join specific chat room (e.g. appointment ID)
        socket.on('join_chat', (roomId) => {
            socket.join(roomId);
            console.log(`💬 User ${socket.id} joined chat room: ${roomId}`);
        });

        // Handle chat messages
        socket.on('send_message', async (data) => {
            try {
                const { appointmentId, senderWallet, receiverWallet, content, type } = data;

                // Save to database
                const message = await db.Message.create({
                    appointmentId,
                    senderWallet: senderWallet.toLowerCase(),
                    receiverWallet: receiverWallet.toLowerCase(),
                    content,
                    type: type || 'text',
                    read: false
                });

                // Emit to room (appointment)
                if (appointmentId) {
                    io.to(appointmentId).emit('receive_message', message);
                }

                // Emit to receiver's personal room
                io.to(receiverWallet.toLowerCase()).emit('receive_message', message);

                // Also emit notification to receiver if they are not in the room
                const receiverSocket = userSockets.get(receiverWallet.toLowerCase());
                if (receiverSocket) {
                    io.to(receiverWallet.toLowerCase()).emit('notification', {
                        type: 'new_message',
                        title: 'New Message',
                        message: `You have a new message`,
                        data: message
                    });
                }

            } catch (error) {
                console.error('❌ Error saving message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Typing indicators
        socket.on('typing_start', (data) => {
            const { receiverWallet, senderWallet, appointmentId } = data;
            if (appointmentId) {
                socket.to(appointmentId).emit('user_typing', { senderWallet });
            }
            if (receiverWallet) {
                io.to(receiverWallet.toLowerCase()).emit('user_typing', { senderWallet });
            }
        });

        socket.on('typing_stop', (data) => {
            const { receiverWallet, senderWallet, appointmentId } = data;
            if (appointmentId) {
                socket.to(appointmentId).emit('user_stopped_typing', { senderWallet });
            }
            if (receiverWallet) {
                io.to(receiverWallet.toLowerCase()).emit('user_stopped_typing', { senderWallet });
            }
        });

        // WebRTC Signaling Events
        socket.on('call_user', (data) => {
            const { userToCall, signalData, from, name } = data;
            io.to(userToCall.toLowerCase()).emit('call_user', {
                signal: signalData,
                from,
                name
            });
        });

        socket.on('answer_call', (data) => {
            io.to(data.to.toLowerCase()).emit('call_accepted', data.signal);
        });

        socket.on('end_call', (data) => {
            io.to(data.to.toLowerCase()).emit('call_ended');
        });

        socket.on('ice_candidate', (data) => {
            io.to(data.to.toLowerCase()).emit('ice_candidate', data.candidate);
        });

        socket.on('disconnect', () => {
            console.log('🔌 Client disconnected:', socket.id);
            // Remove from map
            for (const [wallet, id] of userSockets.entries()) {
                if (id === socket.id) {
                    userSockets.delete(wallet);
                    break;
                }
            }
            socket.broadcast.emit('call_ended');
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

/**
 * Send a notification to a specific user
 */
export const sendNotification = async (walletAddress, type, payload) => {
    if (!io || !walletAddress) {
        console.warn('⚠️ sendNotification skipped: io or walletAddress missing');
        return;
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // Persist notification to DB
    try {
        await db.Notification.create({
            userId: normalizedWallet,
            type,
            title: payload.title || 'Notification',
            message: payload.message || '',
            relatedId: payload.relatedId || null,
            relatedType: payload.relatedType || null,
            isRead: false
        });
    } catch (error) {
        console.error('❌ Failed to persist notification:', error);
    }

    // Emit to the room
    io.to(normalizedWallet).emit('notification', {
        type,
        ...payload,
        timestamp: new Date()
    });

    console.log(`🔔 Notification sent to ${normalizedWallet}: ${type}`);
};
