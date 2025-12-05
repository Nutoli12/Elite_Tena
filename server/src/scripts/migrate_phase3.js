import db from '../models/index.js';

const migrate = async () => {
    try {
        console.log('🔌 Connecting to database...');
        await db.sequelize.authenticate();
        console.log('✅ Connection successful.');

        const q = db.sequelize.query.bind(db.sequelize);

        console.log('🛠️ Running Phase 3 Migrations...');

        // Add columns if they don't exist
        const columns = [
            'approvalStatus VARCHAR(255) DEFAULT \'pending\'',
            'approvedBy VARCHAR(255)',
            'approvedAt TIMESTAMP WITH TIME ZONE',
            'rejectionReason TEXT',
            'paymentReceiptUrl TEXT',
            'paymentMethod VARCHAR(255)',
            'paymentConfirmedAt TIMESTAMP WITH TIME ZONE',
            'paymentConfirmedBy VARCHAR(255)',
            'paymentStatus VARCHAR(255) DEFAULT \'pending\'',
            'checkInStatus VARCHAR(255) DEFAULT \'not_checked_in\'',
            'checkedInAt TIMESTAMP WITH TIME ZONE',
            'queueNumber INTEGER',
            'qrCodeData TEXT',
            'consultationStartedAt TIMESTAMP WITH TIME ZONE',
            'consultationEndedAt TIMESTAMP WITH TIME ZONE'
        ];

        for (const col of columns) {
            try {
                const colName = col.split(' ')[0];
                console.log(`   Adding ${colName}...`);
                await q(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "${colName}" ${col.substring(colName.length + 1)};`);
            } catch (e) {
                console.log(`   ⚠️ Error adding column (might exist): ${e.message}`);
            }
        }

        console.log('✅ Columns added.');

        // Update ENUMs
        console.log('🔄 Updating ENUMs...');
        try { await q(`ALTER TYPE "enum_appointments_paymentStatus" ADD VALUE 'confirmed';`); } catch (e) { console.log('   Note: confirmed enum value might exist'); }
        try { await q(`ALTER TYPE "enum_appointments_paymentStatus" ADD VALUE 'paid';`); } catch (e) { console.log('   Note: paid enum value might exist'); }

        console.log('✅ Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
