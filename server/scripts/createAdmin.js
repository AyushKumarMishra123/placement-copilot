/**
 * Administrator Provisioning Script
 * Safely creates or promotes an administrative user from the server console.
 * Usage:
 *   node scripts/createAdmin.js --email admin@example.com --password securePassword123 --name "Admin Name"
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      parsed[key] = val;
    }
  }
  return parsed;
}

async function run() {
  const args = parseArgs();
  const email = (args.email || process.env.ADMIN_INITIAL_EMAIL || 'admin@placementcopilot.local').toLowerCase().trim();
  const password = args.password || process.env.ADMIN_INITIAL_PASSWORD || 'AdminSecurePass2026!';
  const name = (args.name || process.env.ADMIN_INITIAL_NAME || 'Platform Administrator').trim();

  if (!email || !password || password.length < 8) {
    console.error('Error: Email and a password with at least 8 characters are required.');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placement_copilot';

  console.log(`[Admin Provisioning] Connecting to MongoDB...`);
  await mongoose.connect(mongoUri);

  try {
    let user = await User.findOne({ email });

    if (user) {
      user.role = 'admin';
      user.passwordHash = await User.hashPassword(password);
      if (name) user.name = name;
      await user.save();
      console.log(`[Admin Provisioning] Existing account updated: ${email} is now an administrator.`);
    } else {
      const passwordHash = await User.hashPassword(password);
      user = await User.create({
        name,
        email,
        passwordHash,
        role: 'admin'
      });
      console.log(`[Admin Provisioning] New administrator account successfully created: ${email}`);
    }
  } catch (err) {
    console.error('[Admin Provisioning Error]', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[Admin Provisioning] Database connection closed.');
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
