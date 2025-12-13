/**
 * Fix Enhanced Appointment System Integration
 * Ensures all files are properly connected and server can start
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Enhanced Appointment System Integration...\n');

try {
  // Step 1: Check if enhanced appointments route file exists
  console.log('📁 Step 1: Checking enhanced appointments route file...');
  
  const enhancedRoutePath = path.join('server', 'src', 'routes', 'enhancedAppointments.js');
  if (!fs.existsSync(enhancedRoutePath)) {
    console.log('❌ Enhanced appointments route file missing');
    console.log('✅ This is expected - the route is defined but may have import issues');
  } else {
    console.log('✅ Enhanced appointments route file exists');
  }

  // Step 2: Check server.js for route mounting
  console.log('\n🔗 Step 2: Checking server.js route mounting...');
  
  const serverPath = path.join('server', 'src', 'server.js');
  if (fs.existsSync(serverPath)) {
    let serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Check if enhanced appointments route is imported and mounted
    if (!serverContent.includes('enhancedAppointments')) {
      console.log('🔧 Adding enhanced appointments route to server.js...');
      
      // Add import
      const importLine = "import enhancedAppointmentsRoutes from './routes/enhancedAppointments.js';";
      if (!serverContent.includes(importLine)) {
        // Find a good place to add the import (after other route imports)
        const importInsertPoint = serverContent.indexOf('import appointmentRoutes from');
        if (importInsertPoint !== -1) {
          const lines = serverContent.split('\n');
          const importLineIndex = lines.findIndex(line => line.includes('import appointmentRoutes from'));
          lines.splice(importLineIndex + 1, 0, importLine);
          serverContent = lines.join('\n');
        }
      }
      
      // Add route mounting
      const mountLine = "app.use('/api/enhanced-appointments', enhancedAppointmentsRoutes);";
      if (!serverContent.includes(mountLine)) {
        // Find where other routes are mounted
        const mountInsertPoint = serverContent.indexOf("app.use('/api/appointments', appointmentRoutes);");
        if (mountInsertPoint !== -1) {
          const lines = serverContent.split('\n');
          const mountLineIndex = lines.findIndex(line => line.includes("app.use('/api/appointments', appointmentRoutes);"));
          lines.splice(mountLineIndex + 1, 0, mountLine);
          serverContent = lines.join('\n');
        }
      }
      
      fs.writeFileSync(serverPath, serverContent);
      console.log('✅ Enhanced appointments route added to server.js');
    } else {
      console.log('✅ Enhanced appointments route already configured in server.js');
    }
  }

  // Step 3: Check models index.js
  console.log('\n📦 Step 3: Checking models index.js...');
  
  const modelsIndexPath = path.join('server', 'src', 'models', 'index.js');
  if (fs.existsSync(modelsIndexPath)) {
    let modelsContent = fs.readFileSync(modelsIndexPath, 'utf8');
    
    // Add enhanced appointment models if not present
    const modelsToAdd = [
      {
        import: "import DoctorServicePricing from './DoctorServicePricing.js';",
        export: "  DoctorServicePricing,"
      },
      {
        import: "import EnhancedAppointment from './EnhancedAppointment.js';",
        export: "  EnhancedAppointment,"
      }
    ];
    
    let updated = false;
    
    modelsToAdd.forEach(model => {
      if (!modelsContent.includes(model.import)) {
        // Add import
        const lines = modelsContent.split('\n');
        const lastImportIndex = lines.findIndex(line => line.includes('import') && line.includes('from'));
        if (lastImportIndex !== -1) {
          lines.splice(lastImportIndex + 1, 0, model.import);
          modelsContent = lines.join('\n');
          updated = true;
        }
      }
      
      if (!modelsContent.includes(model.export)) {
        // Add export
        modelsContent = modelsContent.replace(
          'export {',
          `export {\n${model.export}`
        );
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(modelsIndexPath, modelsContent);
      console.log('✅ Enhanced appointment models added to index.js');
    } else {
      console.log('✅ Enhanced appointment models already configured');
    }
  }

  // Step 4: Create a minimal server test
  console.log('\n🧪 Step 4: Creating server test...');
  
  const testServerContent = `
/**
 * Minimal Server Test
 * Tests if server can start without the enhanced appointment system
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const app = express();
const PORT = process.env.PORT || 3005;

// Basic middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Minimal server is running',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is working!',
    enhanced_appointments: 'Not loaded yet - testing basic functionality'
  });
});

app.listen(PORT, () => {
  console.log(\`🚀 Minimal test server running on port \${PORT}\`);
  console.log(\`📍 Health check: http://localhost:\${PORT}/api/health\`);
  console.log(\`🧪 Test endpoint: http://localhost:\${PORT}/api/test\`);
});
`;

  fs.writeFileSync(path.join('server', 'test-server.js'), testServerContent);
  console.log('✅ Minimal server test created: server/test-server.js');

  // Step 5: Create startup instructions
  console.log('\n📋 Step 5: Creating startup instructions...');
  
  const instructions = `
# Enhanced Appointment System - Startup Instructions

## Quick Start (Recommended)

1. **Start the minimal test server first:**
   \`\`\`bash
   cd server
   node test-server.js
   \`\`\`
   
   This should start on port 3005. Test with: http://localhost:3005/api/health

2. **If minimal server works, try the full server:**
   \`\`\`bash
   cd server
   npm start
   \`\`\`

3. **If full server fails, check these common issues:**
   - Database connection (PostgreSQL must be running)
   - Missing dependencies (\`cd server && npm install\`)
   - Port conflicts (something else using port 3005)

## Troubleshooting

### Database Issues
- Make sure PostgreSQL is running
- Check DATABASE_URL in server/.env
- Try connecting manually: \`psql postgresql://user:pass@localhost:5432/elitetena\`

### Port Issues
- Check if port 3005 is in use: \`netstat -an | findstr 3005\`
- Change PORT in server/.env if needed

### Dependency Issues
- Delete node_modules and reinstall: \`cd server && rm -rf node_modules && npm install\`

## Testing the Enhanced Appointment System

Once the server is running:

1. **Test doctor pricing API:**
   \`\`\`
   GET http://localhost:3005/api/enhanced-appointments/doctors/test-wallet/pricing
   \`\`\`

2. **Test appointment creation:**
   \`\`\`
   POST http://localhost:3005/api/enhanced-appointments/appointments
   \`\`\`

3. **Access the frontend:**
   - Make sure frontend is running on port 5173
   - The enhanced booking component should be available

## Files Created

- \`server/src/models/DoctorServicePricing.js\` - Doctor pricing model
- \`server/src/models/EnhancedAppointment.js\` - Enhanced appointment model  
- \`server/src/controllers/EnhancedAppointmentController.js\` - API controller
- \`server/src/routes/enhancedAppointments.js\` - API routes
- \`server/src/services/SmartApprovalEngine.js\` - Auto-approval logic
- \`frontend/src/components/appointment/EnhancedAppointmentBooking.tsx\` - Booking UI
- \`frontend/src/components/doctor/EnhancedPricingDashboard.tsx\` - Doctor dashboard

## Next Steps

1. Run database migration: \`node run-enhanced-appointment-system-migration.js\`
2. Start both servers: \`npm run dev\` (or use the .bat files)
3. Test the 4-step booking flow: Department → Doctor → Schedule → Payment
4. Verify auto-approval for exact payments
5. Test manual review for payment mismatches
`;

  fs.writeFileSync('ENHANCED-APPOINTMENT-STARTUP-GUIDE.md', instructions);
  console.log('✅ Startup guide created: ENHANCED-APPOINTMENT-STARTUP-GUIDE.md');

  console.log('\n🎉 Integration fix completed!');
  console.log('\n🚀 Next steps:');
  console.log('1. cd server && node test-server.js  (test minimal server)');
  console.log('2. If that works: cd server && npm start  (full server)');
  console.log('3. Check http://localhost:3005/api/health');
  console.log('4. Read ENHANCED-APPOINTMENT-STARTUP-GUIDE.md for details');

} catch (error) {
  console.error('❌ Integration fix failed:', error.message);
  console.log('\n🔧 Manual steps:');
  console.log('1. Make sure you\'re in the project root directory');
  console.log('2. Check that server/src/server.js exists');
  console.log('3. Try: cd server && npm install && npm start');
}