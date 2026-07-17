/**
 * Database Seeder — Creates default admin, donor, and requester users.
 * Run with: npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('./db');

async function seed() {
  await connectDB();

  const User = require('../models/User');
  const Donor = require('../models/Donor');
  const BloodRequest = require('../models/BloodRequest');

  // Default password
  const defaultPassword = 'Admin@RVR2026';
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // 1. Seed Admins
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

  // 2. Seed Donors
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const donorNames = [
    'Ramesh Kumar', 'Suresh Raina', 'Priya Sharma', 'Amit Patel',
    'Neha Reddy', 'Vikram Singh', 'Ananya Sen', 'Rahul Verma'
  ];

  console.log('\nSeeding Donors...');
  for (let i = 0; i < bloodGroups.length; i++) {
    const bg = bloodGroups[i];
    const name = donorNames[i];
    const email = `donor.${bg.toLowerCase().replace('+', 'pos').replace('-', 'neg')}@example.com`;
    
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        fullName: name,
        email,
        passwordHash,
        phone: `+91987654321${i}`,
        role: 'donor',
        bloodGroup: bg,
        isVerified: true,
        isActive: true,
      });
      console.log(`Donor User created: ${email}`);
    }

    const donorProfile = await Donor.findOne({ userId: user._id });
    if (!donorProfile) {
      await Donor.create({
        userId: user._id,
        bloodGroup: bg,
        dateOfBirth: new Date(1995, i, 15),
        gender: i % 2 === 0 ? 'male' : 'female',
        weightKg: 65 + i * 2,
        isAvailable: true,
        address: {
          line: `Street ${i + 1}, Main Bazar`,
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500001',
        },
        location: {
          type: 'Point',
          coordinates: [78.4867 + i * 0.01, 17.3850 + i * 0.01],
        },
        totalDonations: i % 3,
      });
      console.log(`Donor Profile created for: ${name} (${bg})`);
    }
  }

  // 3. Seed Requesters and Requests
  console.log('\nSeeding Requesters and Requests...');
  const requesters = [
    { name: 'Kiran Goud', email: 'kiran@example.com', phone: '+918888888881' },
    { name: 'Jyothi Rao', email: 'jyothi@example.com', phone: '+918888888882' },
  ];

  const requestsData = [
    {
      patientName: 'Sunita Goud',
      bloodGroupNeeded: 'A+',
      unitsNeeded: 2,
      urgency: 'critical',
      hospitalName: 'Apollo Hospitals',
      hospitalAddress: 'Jubilee Hills',
      hospitalCity: 'Hyderabad',
      hospitalState: 'Telangana',
      hospitalPincode: '500033',
      contactName: 'Kiran Goud',
      status: 'pending_verification',
    },
    {
      patientName: 'Venkat Rao',
      bloodGroupNeeded: 'O-',
      unitsNeeded: 3,
      urgency: 'urgent',
      hospitalName: 'Care Hospitals',
      hospitalAddress: 'Banjara Hills',
      hospitalCity: 'Hyderabad',
      hospitalState: 'Telangana',
      hospitalPincode: '500034',
      contactName: 'Jyothi Rao',
      status: 'fulfilled',
    },
    {
      patientName: 'Prasad Sen',
      bloodGroupNeeded: 'B+',
      unitsNeeded: 1,
      urgency: 'standard',
      hospitalName: 'Yashoda Hospitals',
      hospitalAddress: 'Somajiguda',
      hospitalCity: 'Hyderabad',
      hospitalState: 'Telangana',
      hospitalPincode: '500082',
      contactName: 'Jyothi Rao',
      status: 'pending',
    },
  ];

  for (let i = 0; i < requesters.length; i++) {
    const reqInfo = requesters[i];
    let user = await User.findOne({ email: reqInfo.email });
    if (!user) {
      user = await User.create({
        fullName: reqInfo.name,
        email: reqInfo.email,
        passwordHash,
        phone: reqInfo.phone,
        role: 'requester',
        isVerified: true,
        isActive: true,
      });
      console.log(`Requester User created: ${reqInfo.email}`);
    }
  }

  const requester1 = await User.findOne({ email: 'kiran@example.com' });
  const requester2 = await User.findOne({ email: 'jyothi@example.com' });

  for (let i = 0; i < requestsData.length; i++) {
    const reqData = requestsData[i];
    const requester = i === 0 ? requester1 : requester2;
    
    const existingReq = await BloodRequest.findOne({
      patientName: reqData.patientName,
      bloodGroupNeeded: reqData.bloodGroupNeeded,
    });

    if (!existingReq) {
      await BloodRequest.create({
        ...reqData,
        requesterId: requester._id,
        contactPhone: requester.phone,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        hospitalLocation: {
          type: 'Point',
          coordinates: [78.4000 + i * 0.02, 17.4000 + i * 0.02],
        },
      });
      console.log(`Blood Request created for: ${reqData.patientName} (${reqData.bloodGroupNeeded})`);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log(`Default password for all users: ${defaultPassword}`);
  console.log('⚠️  Change this password in production!\n');

  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
