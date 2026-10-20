import mongoose from 'mongoose';

const keySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    uniqueKey: {
      type: String,
      required: true,
      trim: true,
    },
    fingerprint: {
      type: String,
      required: true,
      trim: true,
    },
    // Public Key (ElGamal / RSA): Stored in database normally, accessible to senders
    publicKey: {
      type: String,
      required: true,
    },
    // Private Key (ElGamal / RSA): Stored in database in encrypted format only
    // Only the receiver can decrypt it using their secret key / credentials.
    // select: false ensures it is NEVER leaked in generic queries or to other users!
    encryptedPrivateKey: {
      type: String,
      default: '',
      select: false,
    },
    privateKeyIv: {
      type: String,
      default: '',
      select: false,
    },
    privateKeySalt: {
      type: String,
      default: '',
      select: false,
    },
    algorithm: {
      type: String,
      default: 'ElGamal+DES (RSA-OAEP+AES-GCM)',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.userId = ret.user?.toString();
        delete ret._id;
        delete ret.__v;
        // Strip encrypted private key from general json transformation
        delete ret.encryptedPrivateKey;
        delete ret.privateKeyIv;
        delete ret.privateKeySalt;
        return ret;
      },
    },
  }
);

const Key = mongoose.model('Key', keySchema);
export default Key;
