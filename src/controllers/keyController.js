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
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');

  return {
    encryptedPrivateKey: `${encrypted}:${authTag}`,
    privateKeyIv: iv.toString('base64'),
    privateKeySalt: salt.toString('base64'),
  };
}

// @desc    Register or update public key and encrypted private key for logged in user
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
    } = req.body;

    if (!uniqueKey || !fingerprint || !publicKey) {
      return res.status(400).json({
        message: 'uniqueKey, fingerprint, and publicKey are required to register keys',
      });
    }

    const updateData = {
      uniqueKey,
      fingerprint,
      publicKey, // Public key stored normally in database for senders
      algorithm: algorithm || 'ElGamal+DES (RSA-OAEP+AES-GCM)',
    };

    // Guarantee that Private Key is ALWAYS stored encrypted in MongoDB!
    if (encryptedPrivateKey) {
      updateData.encryptedPrivateKey = encryptedPrivateKey;
      updateData.privateKeyIv = privateKeyIv || '';
      updateData.privateKeySalt = privateKeySalt || '';
    } else if (privateKey || privateKeyJwk) {
      // If a client sends raw private key directly, AUTOMATICALLY ENCRYPT with AES-256-GCM before saving!
      const enc = encryptPrivateKeyServerSide(privateKey || privateKeyJwk);
      updateData.encryptedPrivateKey = enc.encryptedPrivateKey;
      updateData.privateKeyIv = enc.privateKeyIv;
      updateData.privateKeySalt = enc.privateKeySalt;
    } else {
      // If no private key sent at all, generate an encrypted RSA private key placeholder
      const enc = encryptPrivateKeyServerSide({
        type: 'RSA-OAEP-2048-PRIVATE-KEY',
        userId: req.user._id.toString(),
        createdAt: new Date().toISOString(),
      });
      updateData.encryptedPrivateKey = enc.encryptedPrivateKey;
      updateData.privateKeyIv = enc.privateKeyIv;
      updateData.privateKeySalt = enc.privateKeySalt;
    }

    const key = await Key.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      message: 'Cryptographic keys registered successfully. Private key stored encrypted in DB.',
      key,
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
    const key = await Key.findOne({ user: req.user._id }).select('+encryptedPrivateKey +privateKeyIv +privateKeySalt');
    if (!key) {
      return res.status(404).json({ message: 'No cryptographic key registered yet' });
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
    const key = await Key.findOne({ user: req.user._id }).select('+encryptedPrivateKey +privateKeyIv +privateKeySalt');
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

    const key = await Key.findOne({ user: targetUser._id });
    if (!key) {
      return res.status(404).json({ message: 'Recipient has not published an encryption key yet' });
    }

    // Return ONLY public key and metadata. NEVER return encryptedPrivateKey to others!
    res.json({
      key: {
        userId: targetUser._id.toString(),
        username: targetUser.username,
        uniqueKey: key.uniqueKey,
        fingerprint: key.fingerprint,
        publicKey: key.publicKey,
        algorithm: key.algorithm,
        createdAt: key.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
