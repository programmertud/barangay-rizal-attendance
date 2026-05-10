const { onRequest } = require('firebase-functions/v2/https');
let defineSecret;
try {
  defineSecret = require('firebase-functions/params').defineSecret;
} catch (e) {
  // Older CLI / local emulator may not expose defineSecret; fall back to env var
  defineSecret = null;
}
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

const deviceToken = defineSecret ? defineSecret('DEVICE_TOKEN') : null;

function formatDateYYYYMMDD(date, timeZone) {
  return date.toLocaleDateString('en-CA', { timeZone });
}

function normalizeUid(uid) {
  return String(uid || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

exports.rfidAttendance = onRequest({ cors: true, secrets: [deviceToken] }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Determine expected device token. Prefer the Functions secret when available,
    // otherwise fall back to the environment variable `DEVICE_TOKEN` (useful for
    // local emulator testing without deploying secrets).
    let expectedToken = '';
    try {
      if (deviceToken && typeof deviceToken.value === 'function') {
        expectedToken = deviceToken.value();
      }
    } catch (e) {
      expectedToken = process.env.DEVICE_TOKEN || '';
    }
    if (!expectedToken) expectedToken = process.env.DEVICE_TOKEN || '';

    const providedToken = req.get('x-device-token') || '';

    if (!expectedToken) {
      res.status(500).json({ error: 'Server not configured: DEVICE_TOKEN not set' });
      return;
    }

    if (providedToken !== expectedToken) {
      res.status(401).json({ error: 'Unauthorized device' });
      return;
    }

    const uid = normalizeUid(req.body?.uid);
    if (!uid) {
      res.status(400).json({ error: 'Missing uid' });
      return;
    }

    const timeZone = 'Asia/Manila';
    const now = new Date();
    const date = formatDateYYYYMMDD(now, timeZone);

    const officialsSnap = await db
      .collection('officials')
      .where('rfidUid', '==', uid)
      .limit(1)
      .get();

    if (officialsSnap.empty) {
      res.status(404).json({ error: 'Unknown RFID', uid });
      return;
    }

    const officialDoc = officialsSnap.docs[0];
    const officialId = officialDoc.id;
    const official = officialDoc.data();

    const attendanceId = `${date}_${officialId}`;
    const attendanceRef = db.collection('attendance').doc(attendanceId);

    const attendanceSnap = await attendanceRef.get();

    if (!attendanceSnap.exists) {
      await attendanceRef.set({
        officialId,
        date,
        checkIn: admin.firestore.FieldValue.serverTimestamp(),
        status: 'present',
        deviceUid: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        ok: true,
        action: 'check_in',
        date,
        officialId,
        officialName: official.name || null,
      });
      return;
    }

    const record = attendanceSnap.data() || {};

    if (!record.checkOut) {
      await attendanceRef.update({
        checkOut: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        ok: true,
        action: 'check_out',
        date,
        officialId,
        officialName: official.name || null,
      });
      return;
    }

    res.json({
      ok: true,
      action: 'already_checked_out',
      date,
      officialId,
      officialName: official.name || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});
