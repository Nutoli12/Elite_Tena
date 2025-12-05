/**
 * Fix Missing Doctor Records
 * 
 * This script finds all users with role='doctor' who don't have
 * a corresponding record in the doctors table, and creates one.
 */

import db from '../src/models/index.js';

const fixMissingDoctors = async () => {
    console.log('🔍 Scanning for users missing doctor records...\n');

    try {
        // Find all doctor users
        const doctorUsers = await db.User.findAll({
            where: { role: 'doctor' }
        });

        console.log(`Found ${doctorUsers.length} users with role='doctor'`);

        let fixed = 0;
        let alreadyExists = 0;

        for (const user of doctorUsers) {
            // Check if doctor record exists
            const existingDoctor = await db.Doctor.findOne({
                where: { walletAddress: user.walletAddress.toLowerCase() }
            });

            if (!existingDoctor) {
                // Create missing doctor record with default values
                await db.Doctor.create({
                    walletAddress: user.walletAddress.toLowerCase(),
                    specialization: user.profileData?.specialization || 'General Medicine',
                    licenseNumber: user.profileData?.licenseNumber || `LIC-${Date.now()}`
                });
                console.log(`✅ Created doctor record for: ${user.walletAddress}`);
                fixed++;
            } else {
                alreadyExists++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   Total doctor users: ${doctorUsers.length}`);
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

fixMissingDoctors();
