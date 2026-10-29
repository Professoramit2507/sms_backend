import crypto from 'crypto';
import Key from '../models/Key.js';
import User from '../models/User.js';

const SERVER_SECRET = process.env.JWT_SECRET || 'secure_sms_super_secret_jwt_key_2026_!@#$';

/**
 * Server-side helper to encrypt private key using AES-256-GCM + PBKDF2 (100,000 rounds).
 * Guarantees that even if raw private key is sent, MongoDB stores ONLY encrypted ciphertext!
 */
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

/**
 * Generate a new RSA-2048 key pair server-side
 */
export function generateServerKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const cleanPublicKey = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');

  const fingerprintHex = crypto
    .createHash('sha256')
    .update(cleanPublicKey)
    .digest('hex')
    .toUpperCase()
    .match(/.{1,2}/g)
    .slice(0, 16)
    .join(':');

  const randomHex = crypto.randomBytes(8).toString('hex').toUpperCase();
  const uniqueKey = `RCV-KEY-${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}-${randomHex.slice(8, 12)}-${randomHex.slice(12, 16)}`;

  return {
    publicKey: cleanPublicKey,
    privateKeyPem: privateKey,
    fingerprint: `SHA256:${fingerprintHex}`,
    uniqueKey,
  };
}

/**
 * Helper to ensure a user's keys are stored in MongoDB every time.
 * Public key is stored normally (plaintext string),
 * Private key is stored strictly encrypted (AES-256-GCM ciphertext).
 */
export async function createOrUpdateUserKey(userId, keyData = {}) {
  // If user already has a key in DB and no new key was explicitly provided, KEEP THE SAME KEY!
  const existingKey = await Key.findOne({ user: userId }).select('+encryptedPrivateKey +privateKeyIv +privateKeySalt');
  if (existingKey && !keyData.publicKey && !keyData.uniqueKey) {
    return existingKey;
  }

  let {
    uniqueKey,
    fingerprint,
    publicKey,
    encryptedPrivateKey,
    privateKey,
    privateKeyJwk,
    privateKeyIv,
    privateKeySalt,
    algorithm,
  } = keyData;

  // 1. If no public key provided, generate a fresh RSA keypair
  if (!publicKey) {
    const pair = generateServerKeyPair();
    publicKey = pair.publicKey;
    uniqueKey = uniqueKey || pair.uniqueKey;
    fingerprint = fingerprint || pair.fingerprint;
    const enc = encryptPrivateKeyServerSide(pair.privateKeyPem);
    encryptedPrivateKey = enc.encryptedPrivateKey;
    privateKeyIv = enc.privateKeyIv;
    privateKeySalt = enc.privateKeySalt;
  } else if (!encryptedPrivateKey) {
    // If public key is provided but encryptedPrivateKey is missing, encrypt whatever private key was provided
    if (privateKey || privateKeyJwk) {
      const enc = encryptPrivateKeyServerSide(privateKey || privateKeyJwk);
      encryptedPrivateKey = enc.encryptedPrivateKey;
      privateKeyIv = enc.privateKeyIv;
      privateKeySalt = enc.privateKeySalt;
    } else {
      const enc = encryptPrivateKeyServerSide({
        type: 'RSA-OAEP-2048-PRIVATE-KEY',
        userId: userId.toString(),
        createdAt: new Date().toISOString(),
      });
      encryptedPrivateKey = enc.encryptedPrivateKey;
      privateKeyIv = enc.privateKeyIv;
      privateKeySalt = enc.privateKeySalt;
    }
  }

  if (!uniqueKey) {
    const randomHex = crypto.randomBytes(8).toString('hex').toUpperCase();
    uniqueKey = `RCV-KEY-${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}-${randomHex.slice(8, 12)}-${randomHex.slice(12, 16)}`;
  }

  if (!fingerprint) {
    const hash = crypto
      .createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .toUpperCase()
      .match(/.{1,2}/g)
      .slice(0, 16)
      .join(':');
    fingerprint = `SHA256:${hash}`;
  }

  const updateData = {
    user: userId,
    uniqueKey,
    fingerprint,
    publicKey, // Normal plaintext SPKI/PEM key stored in DB
    encryptedPrivateKey, // Strictly AES-256-GCM encrypted in DB
    privateKeyIv: privateKeyIv || '',
    privateKeySalt: privateKeySalt || '',
    algorithm: algorithm || 'RSA-OAEP-2048+AES-GCM',
  };

  const key = await Key.findOneAndUpdate(
    { user: userId },
    updateData,
    { new: true, upsert: true, runValidators: true }
  );

  return key;
}

// @desc    Register or update public key and encrypted private key
// @route   POST /api/keys
// @access  Private
export const registerKey = async (req, res, next) => {
  try {
    const {
      uniqueKey,
      fingerprint,
      publicKey,
      encryptedPrivateKey,
      privateKey,
      privateKeyJwk,
      privateKeyIv,
      privateKeySalt,
      algorithm,
      userId,
      targetUserId,
    } = req.body;

    const effectiveUserId =
      (userId && /^[0-9a-fA-F]{24}$/.test(userId))
        ? userId
        : (targetUserId && /^[0-9a-fA-F]{24}$/.test(targetUserId))
        ? targetUserId
        : req.user._id;

    const key = await createOrUpdateUserKey(effectiveUserId, {
      uniqueKey,
      fingerprint,
      publicKey,
      encryptedPrivateKey,
      privateKey,
      privateKeyJwk,
      privateKeyIv,
      privateKeySalt,
      algorithm,
    });

    res.status(201).json({
      success: true,
      message: 'Cryptographic keys registered successfully. Public key stored normally, private key stored encrypted in DB.',
      key,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate a fresh key pair (public key normal, private key encrypted)
// @route   POST /api/keys/generate
// @access  Private
export const generateNewKey = async (req, res, next) => {
  try {
    const pair = generateServerKeyPair();
    const enc = encryptPrivateKeyServerSide(pair.privateKeyPem);

    const key = await Key.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        uniqueKey: pair.uniqueKey,
        fingerprint: pair.fingerprint,
        publicKey: pair.publicKey, // Normal
        encryptedPrivateKey: enc.encryptedPrivateKey, // Encrypted
        privateKeyIv: enc.privateKeyIv,
        privateKeySalt: enc.privateKeySalt,
        algorithm: 'RSA-OAEP-2048+AES-GCM',
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      message: 'New key pair generated successfully. Public key stored normally, private key stored encrypted.',
      key: {
        id: key._id.toString(),
        userId: key.user.toString(),
        uniqueKey: key.uniqueKey,
        fingerprint: key.fingerprint,
        publicKey: key.publicKey,
        encryptedPrivateKey: enc.encryptedPrivateKey,
        algorithm: key.algorithm,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's key (including encrypted private key for receiver decryption)
// @route   GET /api/keys/me
// @access  Private
export const getMyKey = async (req, res, next) => {
  try {
    let key = await Key.findOne({ user: req.user._id }).select('+encryptedPrivateKey +privateKeyIv +privateKeySalt');
    if (!key) {
      key = await createOrUpdateUserKey(req.user._id);
    }

    res.json({
      success: true,
      key: {
        id: key._id.toString(),
        userId: key.user.toString(),
        uniqueKey: key.uniqueKey,
        fingerprint: key.fingerprint,
        publicKey: key.publicKey,
        encryptedPrivateKey: key.encryptedPrivateKey, // Returned ONLY to the owner
        privateKeyIv: key.privateKeyIv,
        privateKeySalt: key.privateKeySalt,
        algorithm: key.algorithm,
        createdAt: key.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get key status of current user
// @route   GET /api/keys/status
// @access  Private
export const getKeyStatus = async (req, res, next) => {
  try {
    let key = await Key.findOne({ user: req.user._id }).select('+encryptedPrivateKey +privateKeyIv +privateKeySalt');
    if (!key) {
      key = await createOrUpdateUserKey(req.user._id);
    }
    res.json({
      hasKey: !!key,
      hasPrivateKey: !!(key && key.encryptedPrivateKey),
      key: key || null,
      algorithm: key?.algorithm || null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get PUBLIC key for specific user (sender uses this to encrypt messages)
// @route   GET /api/keys/:userId
// @access  Private
export const getKeyByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;

    let targetUser;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(userId);
    } else {
      targetUser = await User.findOne({ username: userId.toLowerCase() });
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let key = await Key.findOne({ user: targetUser._id });
    if (!key) {
      // Auto-create key for user if missing so DB always holds their keys
      key = await createOrUpdateUserKey(targetUser._id);
    }

    // Return ONLY public key and metadata. NEVER return encryptedPrivateKey to others!
    res.json({
      key: {
        userId: targetUser._id.toString(),
        username: targetUser.username,
        uniqueKey: key.uniqueKey,
        fingerprint: key.fingerprint,
        publicKey: key.publicKey, // Normal public key
        algorithm: key.algorithm,
        createdAt: key.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
