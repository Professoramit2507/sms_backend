import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import Key from '../models/Key.js';
import User from '../models/User.js';

dotenv.config();

const SERVER_SECRET = process.env.JWT_SECRET || 'secure_sms_super_secret_jwt_key_2026_!@#$';

export function encryptPrivateKeyServerSide(rawKeyData) {
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.pbkdf2Sync(SERVER_SECRET, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

  const text = typeof rawKeyData === 'object' ? JSON.stringify(rawKeyData) : String(rawKeyData);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('base64');
  const authTag = cipher.getAuthTag().toString('base64');

  return {
    encryptedPrivateKey: `${ciphertext}:${authTag}`,
    privateKeyIv: iv.toString('base64'),
    privateKeySalt: salt.toString('base64'),
  };
}

export const ALICE_PERMANENT = {
  uniqueKey: 'RCV-KEY-7120-04A6-9957-D76B',
  fingerprint: 'SHA256:D5:7D:46:66:FB:2B:67:95:98:D5:9D:50',
  publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqMemDFMIERRM8XI4nNzJUgz0OiXkJpSbMHuKovOxPUbea4+mKf3ZlGegV9uL9xnL2eSdll33DYvvdb4YtFhOXDSVF+L9ATMIIpSBkLevu03k+UOsxUr9REoy1egax8JMmqtuvLXFiAIXp2aquDnaDrFbODCEQNtXbTkdbFT4JeMokvP3qcu8HYjPAW+SCnbUgBTClkIPLslO3/Zr8fZyZzGFCV7BmsTcpMCJqKD0g2ZLzLASoMAkonSoYfdfNpCH51gGbI3diDRl1rysJxmOxPobuPEZSDHPkJEuEp64ZIOgGbDfZP8yD7U9SJjPfL4uipGGOsJ0EIGzPp6hpeJlLQIDAQAB',
  privateKeyJwk: JSON.stringify({
    kty: 'RSA',
    n: 'qMemDFMIERRM8XI4nNzJUgz0OiXkJpSbMHuKovOxPUbea4-mKf3ZlGegV9uL9xnL2eSdll33DYvvdb4YtFhOXDSVF-L9ATMIIpSBkLevu03k-UOsxUr9REoy1egax8JMmqtuvLXFiAIXp2aquDnaDrFbODCEQNtXbTkdbFT4JeMokvP3qcu8HYjPAW-SCnbUgBTClkIPLslO3_Zr8fZyZzGFCV7BmsTcpMCJqKD0g2ZLzLASoMAkonSoYfdfNpCH51gGbI3diDRl1rysJxmOxPobuPEZSDHPkJEuEp64ZIOgGbDfZP8yD7U9SJjPfL4uipGGOsJ0EIGzPp6hpeJlLQ',
    e: 'AQAB',
    d: 'FRc5tzGLAQNd6BADZgqq959Zx4hjnbSVPfY6KUm1fLhF5AAD3hx0G3jljwUG1P56vEQ2swsT67PwXPC_yo18YUZK2TzKq-MyIYwYMrrZcVj3A3UC-nZ39pglCRjje9HaW7uPb3JxeCD2zrrkG3hTOOHNydQ6OpaOMr5f4GEvzyADM4wSoUckalejFPpRzwEGXs3CpYZYmhh2w0PLkjhr-kFOOIlny2N-3aPlJmWMuzSrvzE2kEdob9If4VssAcIjnTdYpTTlO8uEBk5xA0v7JYA5pzEq7FODKGjcjZyxVOwnI8C-7XaffINCjrEQ9L9iRu91uLbphOSz55ezoGD1Kw',
    p: '23lWVhkR3ps4H755Dc5zfvzkk5japBKuIRBRnrqDlNpQCsC2vrXtJO08E5khL1gp5mA3ESVCQBfzRApHmdJBtTZYEtZl3TrN2vqii8v6zCuz_ai0X829q5hxwm5D4dVDTNxneYIpmSyzpXlmwv1v75SBOm4jbQdgVdTc2Ah-Qdc',
    q: 'xN5-0b2vMyEgrB3MZqcdCIaLZoN18zs1FPffexzo2S8f41ogXaWUdG0skN9CZ1nc0lYTk4L2tEDnJq8GLTz6lSFZC6edCeyg_N5ulGZHrj_UJ-2rdTUrPmbP6bpqmD12DvC0VMvTZR3gOKQlslnAl7JxHhuoIeDIcBTaTccSuJs',
    dp: 'Yk_3Ibg3Lf1f5bBf75RUXkUQayFkh2yqvbrepPitqockpbxv3_wEj68JY0oL-HZIxp7A7BhBlg5kdU0Zh8kMkA0Y5M9PcAtAXWA6Yd7sqHrHNNBWhDfYR76Q7uSP2eC7NfnhDCgHVEsW6f_4zU3Tz4E5ZiAiFFvihnBEwS0EyZ8',
    dq: 'izn-3j4ThUlMXezE_WP5-GmOdHVMGTQqGiYiemK7mbzmBFdcxF2xW5VKCzqZL5YxwN73AT-BUYEE-CqXZ67UWFs5KjDjsn0SbUKxWWnsD6M8WvCObVmot3zmVRltATWWJIK-RanQWpaCWAxeTH-E4MNllDFi-nKJzhoxOQgsiTk',
    qi: 'OXJouQE529sNaZFqPTMUcIzcaAvN47fr3Uqp_2xtXpFwSSIy5Lsz_lEJI8E6-obIvZNmqevno8NjyZ4qDs0P8kFK6BbvmvkqSMWhMUorG_moP68FCUskVNi5Rm4hztwmIrB0vnbLglOtfeQblLM6Z-ERuePfxxwtsiqhw4I-5q0'
  }),
  algorithm: 'RSA-OAEP-2048+AES-GCM',
};

async function sync() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const alice = await User.findOne({
    $or: [{ username: 'alice' }, { email: 'alice@gmail.com' }, { _id: '6ad75390ff8f3492c4500820' }],
  });

  if (alice) {
    const enc = encryptPrivateKeyServerSide(ALICE_PERMANENT.privateKeyJwk);
    await Key.findOneAndUpdate(
      { user: alice._id },
      {
        user: alice._id,
        uniqueKey: ALICE_PERMANENT.uniqueKey,
        fingerprint: ALICE_PERMANENT.fingerprint,
        publicKey: ALICE_PERMANENT.publicKey,
        encryptedPrivateKey: enc.encryptedPrivateKey,
        privateKeyIv: enc.privateKeyIv,
        privateKeySalt: enc.privateKeySalt,
        algorithm: ALICE_PERMANENT.algorithm,
      },
      { upsert: true, new: true }
    );
    console.log('Alice key locked to permanent matching key:', ALICE_PERMANENT.uniqueKey);
  }

  // Ensure all other users also have permanent matching keys
  const users = await User.find();
  for (const u of users) {
    if (u._id.toString() === alice?._id?.toString()) continue;
    const existing = await Key.findOne({ user: u._id });
    if (!existing) {
      // Create new key
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      const cleanPub = publicKey.replace(/-----BEGIN PUBLIC KEY-----/g, '').replace(/-----END PUBLIC KEY-----/g, '').replace(/\s+/g, '');
      const fp = 'SHA256:' + crypto.createHash('sha256').update(cleanPub).digest('hex').toUpperCase().match(/.{1,2}/g).slice(0, 16).join(':');
      const hex = crypto.randomBytes(8).toString('hex').toUpperCase();
      const uKey = `RCV-KEY-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
      const enc = encryptPrivateKeyServerSide(privateKey);
      await Key.create({
        user: u._id,
        uniqueKey: uKey,
        fingerprint: fp,
        publicKey: cleanPub,
        encryptedPrivateKey: enc.encryptedPrivateKey,
        privateKeyIv: enc.privateKeyIv,
        privateKeySalt: enc.privateKeySalt,
        algorithm: 'RSA-OAEP-2048+AES-GCM',
      });
      console.log(`Created key for user ${u.username}: ${uKey}`);
    }
  }

  // Update existing messages with mismatched test key to Alice's permanent key
  const Message = (await import('../models/Message.js')).default;
  const updateRes = await Message.updateMany(
    { receiverKey: 'RCV-KEY-3968-4F7E-4E5D-872C' },
    { $set: { receiverKey: ALICE_PERMANENT.uniqueKey } }
  );
  console.log(`Updated ${updateRes.modifiedCount} test messages to permanent key ${ALICE_PERMANENT.uniqueKey}`);

  const allKeys = await Key.find();
  console.log('All DB keys:');
  allKeys.forEach((k) => {
    console.log(` - user: ${k.user}, uniqueKey: ${k.uniqueKey}, fp: ${k.fingerprint}`);
  });

  process.exit(0);
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
