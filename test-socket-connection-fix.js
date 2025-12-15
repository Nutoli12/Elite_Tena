const { io } = require('socket.io-client');

async function testSocketConnection() {
  console.log('🔌 Testing Socket.io Connection Fix\n');
  
  try {
    // Test connection to the correct port (3005)
    console.log('📡 Connecting to Socket.io on port 3005...');
    
    const socket = io('http://localhost:3005', {
      transports: ['websocket', 'polling'],
      timeout: 5000
    });
    
    socket.on('connect', () => {
      console.log('✅ Socket.io connected successfully!');
      console.log('   Socket ID:', socket.id);
      console.log('   Transport:', socket.io.engine.transport.name);
      
      // Test identifying as a user
      socket.emit('identify', '0x1764894943291khtk9h');
      console.log('✅ User identification sent');
      
      // Test joining a chat room
      socket.emit('join_chat', 'test-room');
      console.log('✅ Chat room join request sent');
      
      setTimeout(() => {
        socket.disconnect();
        console.log('✅ Socket disconnected');
        console.log('\n🎉 Socket.io connection test PASSED!');
        console.log('   The frontend should now receive real-time messages.');
      }, 2000);
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Socket.io connection failed:', error.message);
      console.log('   Make sure the server is running on port 3005');
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSocketConnection();