import db from './server/src/models/index.js';

async function runLabWorkflowMigration() {
  try {
    console.log('🧪 Starting Lab Workflow System Migration...\n');

    console.log('🔄 Creating lab workflow tables with Sequelize...');
    
    // Force sync the new lab models to create tables
    await db.LabWorkflowOrder.sync({ force: false });
    console.log('✅ LabWorkflowOrder table created/verified');
    
    await db.LabWorkflowResult.sync({ force: false });
    console.log('✅ LabWorkflowResult table created/verified');
    
    await db.LabWorkflowTestCatalog.sync({ force: false });
    console.log('✅ LabWorkflowTestCatalog table created/verified');
    
    await db.LabWorkflowAccessLog.sync({ force: false });
    console.log('✅ LabWorkflowAccessLog table created/verified');

    console.log('\n📊 Adding sample test catalog data...');
    
    // Insert sample test catalog data
    const sampleTests = [
      {
        testCode: 'CBC',
        testName: 'Complete Blood Count',
        testCategory: 'Hematology',
        description: 'Comprehensive blood cell analysis including WBC, RBC, Hemoglobin, Hematocrit, and Platelets',
        sampleType: 'blood',
        fastingRequired: false,
        standardPrice: 25.00,
        turnaroundTimeHours: 4,
        referenceRanges: {
          WBC: { min: 4.5, max: 11.0, unit: 'x10³/μL' },
          RBC: { min: 4.2, max: 5.4, unit: 'x10⁶/μL' },
          Hemoglobin: { min: 12.0, max: 16.0, unit: 'g/dL' }
        },
        criticalValues: {
          WBC: { critical_low: 2.0, critical_high: 30.0 },
          Hemoglobin: { critical_low: 7.0, critical_high: 20.0 }
        }
      },
      {
        testCode: 'GLU',
        testName: 'Blood Glucose',
        testCategory: 'Chemistry',
        description: 'Fasting blood glucose measurement',
        sampleType: 'blood',
        fastingRequired: true,
        standardPrice: 15.00,
        turnaroundTimeHours: 2,
        referenceRanges: {
          glucose: { min: 70, max: 100, unit: 'mg/dL' }
        },
        criticalValues: {
          glucose: { critical_low: 40, critical_high: 400 }
        }
      },
      {
        testCode: 'LIPID',
        testName: 'Lipid Profile',
        testCategory: 'Chemistry',
        description: 'Cholesterol, HDL, LDL, and Triglycerides',
        sampleType: 'blood',
        fastingRequired: true,
        standardPrice: 35.00,
        turnaroundTimeHours: 6,
        referenceRanges: {
          total_cholesterol: { max: 200, unit: 'mg/dL' },
          HDL: { min: 40, unit: 'mg/dL' },
          LDL: { max: 100, unit: 'mg/dL' }
        },
        criticalValues: {
          total_cholesterol: { critical_high: 300 },
          triglycerides: { critical_high: 500 }
        }
      },
      {
        testCode: 'UA',
        testName: 'Urinalysis',
        testCategory: 'Chemistry',
        description: 'Complete urine analysis including protein, glucose, and microscopy',
        sampleType: 'urine',
        fastingRequired: false,
        standardPrice: 20.00,
        turnaroundTimeHours: 3,
        referenceRanges: {
          protein: 'negative',
          glucose: 'negative',
          specific_gravity: { min: 1.003, max: 1.030 }
        },
        criticalValues: {
          protein: '3+',
          glucose: '3+'
        }
      },
      {
        testCode: 'TSH',
        testName: 'Thyroid Stimulating Hormone',
        testCategory: 'Endocrinology',
        description: 'TSH level measurement for thyroid function',
        sampleType: 'blood',
        fastingRequired: false,
        standardPrice: 45.00,
        turnaroundTimeHours: 24,
        referenceRanges: {
          TSH: { min: 0.4, max: 4.0, unit: 'mIU/L' }
        },
        criticalValues: {
          TSH: { critical_low: 0.01, critical_high: 20.0 }
        }
      }
    ];

    // Insert tests (use upsert to avoid duplicates)
    for (const test of sampleTests) {
      try {
        const [testRecord, created] = await db.LabWorkflowTestCatalog.findOrCreate({
          where: { testCode: test.testCode },
          defaults: test
        });
        
        if (created) {
          console.log(`✅ Added test: ${test.testCode} - ${test.testName}`);
        } else {
          console.log(`⚠️  Test already exists: ${test.testCode} - ${test.testName}`);
        }
      } catch (error) {
        console.log(`❌ Failed to add test ${test.testCode}:`, error.message);
      }
    }

    console.log('\n🔧 Adding lab_technician role to users table...');
    
    try {
      // Try to add lab_technician role to the enum (might fail if already exists)
      await db.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'lab_technician' 
            AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'enum_users_role'
            )
          ) THEN
            ALTER TYPE enum_users_role ADD VALUE 'lab_technician';
          END IF;
        END $$;
      `);
      console.log('✅ lab_technician role added to users table');
    } catch (error) {
      console.log('⚠️  Role update skipped (might already exist):', error.message);
    }

    console.log('\n📊 Verifying lab workflow tables...');
    
    // Verify tables were created and get counts
    const orderCount = await db.LabWorkflowOrder.findAndCountAll();
    const resultCount = await db.LabWorkflowResult.findAndCountAll();
    const catalogCount = await db.LabWorkflowTestCatalog.findAndCountAll();
    const logCount = await db.LabWorkflowAccessLog.findAndCountAll();

    console.log(`✅ LabWorkflowOrder table: ${orderCount.count} records`);
    console.log(`✅ LabWorkflowResult table: ${resultCount.count} records`);
    console.log(`✅ LabWorkflowTestCatalog table: ${catalogCount.count} records`);
    console.log(`✅ LabWorkflowAccessLog table: ${logCount.count} records`);

    console.log('\n🧪 Lab Workflow System Migration Completed Successfully! 🎉');
    console.log('\n📋 Available Lab Workflow Endpoints:');
    console.log('   🔬 Lab Test Catalog: GET /api/lab/catalog');
    console.log('   📝 Create Lab Order: POST /api/lab/orders');
    console.log('   📊 Lab Orders: GET /api/lab/orders');
    console.log('   🧪 Upload Results: POST /api/lab/results');
    console.log('   📈 Lab Results: GET /api/lab/results');
    console.log('   👨‍⚕️ Doctor Overview: GET /api/lab/doctor/overview');
    console.log('   🔬 Technician Dashboard: GET /api/lab/technician/dashboard');
    console.log('   👤 Patient History: GET /api/lab/patient/history');
    console.log('   🚨 Critical Results: GET /api/lab/results/critical/alerts');

    console.log('\n🚀 Ready to test! Start the server with: npm run dev');

    process.exit(0);

  } catch (error) {
    console.error('\n💥 Lab Workflow Migration Failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the migration
runLabWorkflowMigration();