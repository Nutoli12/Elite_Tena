import { Server } from 'socket.io';

let io;
const userSockets = new Map(); // Map wallet address -> socket ID

export const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true
        }
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

        socket.on('disconnect', () => {
            console.log('🔌 Client disconnected:', socket.id);
            // Remove from map (optional, but good for cleanup if we tracked by socket ID)
            for (const [wallet, id] of userSockets.entries()) {
                if (id === socket.id) {
                    userSockets.delete(wallet);
                    break;
                }
            }
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
 * @param {string} walletAddress - The user's wallet address
 * @param {string} type - Notification type (e.g., 'appointment_approved')
 * @param {object} payload - Data to send
 */
export const sendNotification = (walletAddress, type, payload) => {
    if (!io) return;

    const normalizedWallet = walletAddress.toLowerCase();

    // Emit to the room (more reliable than socket ID map for multiple tabs)
    io.to(normalizedWallet).emit('notification', {
        type,
        ...payload,
        timestamp: new Date()
    });

    console.log(`🔔 Notification sent to ${normalizedWallet}: ${type}`);
};
