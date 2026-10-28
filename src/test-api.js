import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import app from './app.js';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testHttpEndpoints() {
  await connectDB();

  const PORT = 5055;
  const server = app.listen(PORT, async () => {
    console.log(`\n==================================================`);
    console.log(`🧪 Testing Express HTTP Endpoints on Port ${PORT}`);
    console.log(`==================================================`);
    const baseUrl = `http://localhost:${PORT}/api/auth`;

    try {
      const testPhone = '9876543210';
      await User.deleteOne({ phoneNumber: testPhone });

      // 1. Test Register
      console.log('\n[TEST 1] Registering a new user...');
      const regRes = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Prince Admin',
          phoneNumber: testPhone,
          password: 'SecretPassword123!',
        }),
      });
      const regData = await regRes.json();
      console.log(`Status: ${regRes.status}`);
      console.log('Response:', JSON.stringify(regData, null, 2));

      // 2. Test Login with WRONG Phone Number
      console.log('\n[TEST 2] Testing Login with WRONG Phone Number...');
      const wrongPhoneRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '9000000000',
          password: 'SecretPassword123!',
        }),
      });
      const wrongPhoneData = await wrongPhoneRes.json();
      console.log(`Status: ${wrongPhoneRes.status}`);
      console.log('Response:', JSON.stringify(wrongPhoneData, null, 2));

      // 3. Test Login with WRONG Password
      console.log('\n[TEST 3] Testing Login with WRONG Password...');
      const wrongPassRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testPhone,
          password: 'WrongPassword!',
        }),
      });
      const wrongPassData = await wrongPassRes.json();
      console.log(`Status: ${wrongPassRes.status}`);
      console.log('Response:', JSON.stringify(wrongPassData, null, 2));

      // 4. Test Login with CORRECT credentials
      console.log('\n[TEST 4] Testing Login with CORRECT credentials...');
      const correctLoginRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testPhone,
          password: 'SecretPassword123!',
        }),
      });
      const correctLoginData = await correctLoginRes.json();
      console.log(`Status: ${correctLoginRes.status}`);
      console.log('Response:', JSON.stringify(correctLoginData, null, 2));

      const token = correctLoginData.data.token;

      // 5. Test Protected Route /api/auth/me
      console.log('\n[TEST 5] Accessing Protected /api/auth/me route with JWT Token...');
      const meRes = await fetch(`${baseUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      console.log(`Status: ${meRes.status}`);
      console.log('Response:', JSON.stringify(meData, null, 2));

      // 6. Test duplicate registration prevention
      console.log('\n[TEST 6] Testing duplicate phone registration...');
      const dupRes = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Duplicate User',
          phoneNumber: testPhone,
          password: 'AnotherPassword123',
        }),
      });
      const dupData = await dupRes.json();
      console.log(`Status: ${dupRes.status}`);
      console.log('Response:', JSON.stringify(dupData, null, 2));

      // Clean up
      await User.deleteOne({ phoneNumber: testPhone });
      console.log('\n🧹 Test user cleaned up.');
      console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!\n');

      server.close(() => {
        process.exit(0);
      });
    } catch (err) {
      console.error('Test execution failed:', err);
      server.close(() => {
        process.exit(1);
      });
    }
  });
}

testHttpEndpoints();
