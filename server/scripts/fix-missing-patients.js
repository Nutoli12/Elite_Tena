/**
 * Fix Missing Patient Records
 * 
 * This script finds all users with role='patient' who don't have
 * a corresponding record in the patients table, and creates one.
 */

import db from '../src/models/index.js';

const fixMissingPatients = async () => {
    console.log('🔍 Scanning for users missing patient records...\n');

    try {
        // Find all patient users
        const patientUsers = await db.User.findAll({
            where: { role: 'patient' }
        });

        console.log(`Found ${patientUsers.length} users with role='patient'`);

        let fixed = 0;
        let alreadyExists = 0;

        for (const user of patientUsers) {
            // Check if patient record exists
            const existingPatient = await db.Patient.findOne({
                where: { walletAddress: user.walletAddress.toLowerCase() }
            });

            if (!existingPatient) {
                // Create missing patient record
                await db.Patient.create({
                    walletAddress: user.walletAddress.toLowerCase()
                });
                console.log(`✅ Created patient record for: ${user.walletAddress}`);
                fixed++;
            } else {
                alreadyExists++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   Total patient users: ${patientUsers.length}`);
        console.log(`   Already had records: ${alreadyExists}`);
        console.log(`   Fixed (created new): ${fixed}`);
        console.log('\n✅ Done!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await db.sequelize.close();
    }
};

fixMissingPatients();
