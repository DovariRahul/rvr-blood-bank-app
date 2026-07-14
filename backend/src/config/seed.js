/**
 * Database Seeder — Creates default admin users.
 * Run with: npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('./db');

async function seed() {
  await connectDB();

  const User = require('../models/User');

  // Default admin password
  const adminPassword = 'Admin@RVR2026';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admins = [
    {
      fullName: 'RVR Admin',
      email: 'admin@rvrbloodbank.org',
      passwordHash,
      phone: '+919999999999',
      role: 'admin',
      isVerified: true,
      isActive: true,
    },
    {
      fullName: 'DOVARI RAHUL',
      email: 'dovarirahul@rvrbloodbank.org',
      passwordHash,
      phone: '+919999999998',
      role: 'admin',
      isVerified: true,
      isActive: true,
    },
  ];

  for (const admin of admins) {
    const existing = await User.findOne({ email: admin.email });
    if (existing) {
      console.log(`Admin already exists: ${admin.email}`);
    } else {
      await User.create(admin);
      console.log(`Admin created: ${admin.email}`);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log(`Default admin password: ${adminPassword}`);
  console.log('⚠️  Change this password in production!\n');

  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
