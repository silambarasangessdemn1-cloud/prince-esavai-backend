/**
 * test-aadhaar.js
 * End-to-end API test for the Aadhaar Issue module.
 * Covers: submit, list all, get by aadhaar, get by id, update status, delete.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import app from './app.js';
import User from './models/User.js';
import AadhaarIssue from './models/AadhaarIssue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = 5066;
const BASE = `http://localhost:${PORT}/api`;

let token = '';
let issueId = '';
const TEST_PHONE = '9111122223';
const TEST_AADHAAR = '123456789012';

async function req(method, url, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${url}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

function log(label, status, data) {
  const ok = status >= 200 && status < 300 ? '✅' : '❌';
  console.log(`\n${ok} [${status}] ${label}`);
  console.log(JSON.stringify(data, null, 2));
}

async function run() {
  await connectDB();

  const server = app.listen(PORT, async () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('   Aadhaar Issue API — End-to-End Test Suite');
    console.log('══════════════════════════════════════════════════');

    try {
      // ── Cleanup previous test data ────────────────────────
      await User.deleteOne({ phoneNumber: TEST_PHONE });
      await AadhaarIssue.deleteMany({ aadhaarNumber: TEST_AADHAAR });

      // ── 1. Register & get token ───────────────────────────
      console.log('\n[1] Register test user...');
      const reg = await req('POST', '/auth/register', {
        username: 'Test Agent',
        phoneNumber: TEST_PHONE,
        password: 'Password123!',
      }, false);
      log('Register', reg.status, reg.data);
      token = reg.data.data.token;

      // ── 2. Get meta (issue types, priorities, statuses) ───
      console.log('\n[2] GET /api/aadhaar/meta...');
      const meta = await req('GET', '/aadhaar/meta');
      log('Meta', meta.status, meta.data);

      // ── 3. Submit Issue #1 ────────────────────────────────
      console.log('\n[3] Submit Aadhaar Issue #1...');
      const sub1 = await req('POST', '/aadhaar/issues', {
        aadhaarNumber: TEST_AADHAAR,
        applicantName: 'Rajesh Kumar',
        applicantPhone: '9876543210',
        applicantEmail: 'rajesh@example.com',
        issueType: 'Name Correction',
        issueDescription: 'My name on Aadhaar is spelled incorrectly. It shows "Rejesh" but should be "Rajesh". Need correction urgently.',
        priority: 'High',
        documents: [{ name: 'Birth Certificate.pdf', type: 'application/pdf', size: '1.2 MB' }],
      });
      log('Submit Issue #1', sub1.status, sub1.data);
      issueId = sub1.data.data.issue._id;

      // ── 4. Submit Issue #2 (same Aadhaar) ─────────────────
      console.log('\n[4] Submit Aadhaar Issue #2 (same Aadhaar)...');
      const sub2 = await req('POST', '/aadhaar/issues', {
        aadhaarNumber: TEST_AADHAAR,
        applicantName: 'Rajesh Kumar',
        applicantPhone: '9876543210',
        issueType: 'Address Update',
        issueDescription: 'My current address has changed. Old address was 12 Main Street, Salem. New address is 45 Anna Nagar, Chennai 600040.',
        priority: 'Medium',
      });
      log('Submit Issue #2', sub2.status, sub2.data);

      // ── 5. Submit Issue #3 (same Aadhaar) ─────────────────
      console.log('\n[5] Submit Aadhaar Issue #3 (same Aadhaar)...');
      const sub3 = await req('POST', '/aadhaar/issues', {
        aadhaarNumber: TEST_AADHAAR,
        applicantName: 'Rajesh Kumar',
        applicantPhone: '9876543210',
        issueType: 'Mobile Number Update',
        issueDescription: 'Please update my mobile number linked to Aadhaar from 9000011111 to 9876543210. Old number is no longer in use.',
        priority: 'Low',
      });
      log('Submit Issue #3', sub3.status, sub3.data);

      // ── 6. Validation error: bad Aadhaar number ───────────
      console.log('\n[6] Submit with INVALID Aadhaar (should fail)...');
      const bad = await req('POST', '/aadhaar/issues', {
        aadhaarNumber: '1234',              // too short
        applicantName: 'X',                 // too short
        applicantPhone: '9876543210',
        issueType: 'Name Correction',
        issueDescription: 'Short',          // too short
        priority: 'High',
      });
      log('Validation Error', bad.status, bad.data);

      // ── 7. List ALL issues (paginated) ────────────────────
      console.log('\n[7] GET all issues (page 1, limit 20)...');
      const all = await req('GET', '/aadhaar/issues?page=1&limit=20');
      log('List All Issues', all.status, all.data);

      // ── 8. List issues by Aadhaar number ──────────────────
      console.log(`\n[8] GET issues by Aadhaar: ${TEST_AADHAAR}...`);
      const byAadhaar = await req('GET', `/aadhaar/issues/by-aadhaar/${TEST_AADHAAR}`);
      log('Issues by Aadhaar', byAadhaar.status, byAadhaar.data);

      // ── 9. Get single issue by ID (full audit trail) ──────
      console.log(`\n[9] GET single issue by ID: ${issueId}...`);
      const single = await req('GET', `/aadhaar/issues/${issueId}`);
      log('Single Issue', single.status, single.data);

      // ── 10. Update status → Under Review ─────────────────
      console.log('\n[10] PATCH status → "Under Review"...');
      const upd1 = await req('PATCH', `/aadhaar/issues/${issueId}/status`, {
        status: 'Under Review',
        remarks: 'Agent has picked up the ticket for review.',
      });
      log('Update Status → Under Review', upd1.status, upd1.data);

      // ── 11. Update status → Resolved ─────────────────────
      console.log('\n[11] PATCH status → "Resolved"...');
      const upd2 = await req('PATCH', `/aadhaar/issues/${issueId}/status`, {
        status: 'Resolved',
        remarks: 'Name corrected in UIDAI system. New Aadhaar card dispatched.',
      });
      log('Update Status → Resolved', upd2.status, upd2.data);

      // ── 12. Try delete a resolved issue (should fail) ─────
      console.log('\n[12] DELETE resolved issue (should fail)...');
      const del1 = await req('DELETE', `/aadhaar/issues/${issueId}`);
      log('Delete Resolved Issue (should fail)', del1.status, del1.data);

      // ── 13. Stats summary ─────────────────────────────────
      console.log('\n[13] GET /api/aadhaar/stats...');
      const stats = await req('GET', '/aadhaar/stats');
      log('Stats', stats.status, stats.data);

      // ── 14. Filter: issues by status ──────────────────────
      console.log('\n[14] GET issues filtered by status=Submitted...');
      const filtered = await req('GET', '/aadhaar/issues?status=Submitted');
      log('Filter by status=Submitted', filtered.status, filtered.data);

      // ── 15. Wrong Aadhaar format on lookup ────────────────
      console.log('\n[15] GET by-aadhaar with invalid number (should fail)...');
      const badAadhaar = await req('GET', '/aadhaar/issues/by-aadhaar/1234');
      log('Invalid Aadhaar Lookup', badAadhaar.status, badAadhaar.data);

      // ── Cleanup ───────────────────────────────────────────
      await User.deleteOne({ phoneNumber: TEST_PHONE });
      await AadhaarIssue.deleteMany({ aadhaarNumber: TEST_AADHAAR });
      console.log('\n🧹 Test data cleaned up.');
      console.log('\n🎉 ALL AADHAAR API TESTS COMPLETED!\n');

      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\n❌ Test suite error:', err);
      server.close(() => process.exit(1));
    }
  });
}

run();

