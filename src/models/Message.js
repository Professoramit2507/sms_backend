import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverKey: {
      type: String,
      default: '',
    },
    receiverFingerprint: {
      type: String,
      default: '',
    },
    // The Encrypted Message Content (Ciphertext)
    content: {
      type: String,
      required: true,
    },
    // DES / AES symmetric ciphertext
    ciphertext: {
      type: String,
      default: '',
    },
    // Symmetric Initialization Vector (IV)
    iv: {
      type: String,
      default: '',
    },
    // The symmetric key encrypted using Receiver's ElGamal/RSA Public Key
    wrappedKey: {
      type: String,
      default: '',
    },
    // Plaintext is NEVER stored in the database!
    plaintext: {
      type: String,
      default: '',
      select: false,
    },
    // Full encrypted payload envelope
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    encrypted: {
      type: Boolean,
      default: true,
    },
    algorithm: {
      type: String,
      default: 'DES + ElGamal',
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'delivered',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.conversationId = ret.conversation?.toString();
        ret.senderId = ret.sender?._id ? ret.sender._id.toString() : ret.sender?.toString();
        ret.receiverId = ret.receiver?._id ? ret.receiver._id.toString() : ret.receiver?.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.plaintext; // Guarantee plaintext never leaks
        return ret;
      },
    },
  }
);

// Guarantee plaintext is NEVER stored in database
messageSchema.pre('save', function (next) {
  this.plaintext = '';
  if (this.payload && typeof this.payload === 'object') {
    delete this.payload.plaintext;
    if (this.payload.text && this.payload.text !== this.ciphertext) {
      delete this.payload.text;
    }
  }
  next();
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
