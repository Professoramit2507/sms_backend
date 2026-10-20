import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

// @desc    Get all encrypted messages for a conversation
// @route   GET /api/conversations/:conversationId/messages
// @access  Private
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    // Check if conversation exists and user is a participant
    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conv) {
      return res.status(404).json({ message: 'Conversation not found or access denied' });
    }

    const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 });

    // Mark unread messages received by current user as read
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: req.user._id,
        status: { $ne: 'read' },
      },
      { $set: { status: 'read' } }
    );

    // Reset current user's unreadCount for this conversation
    if (conv.unreadCounts) {
      conv.unreadCounts.set(req.user._id.toString(), 0);
      await conv.save();
    }

    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// @desc    Send an encrypted SMS / message in a conversation
// @route   POST /api/conversations/:conversationId/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const {
      content,
      ciphertext,
      iv,
      wrappedKey,
      payload,
      receiverId,
      receiverKey,
      receiverFingerprint,
      algorithm,
      encrypted,
    } = req.body;

    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conv) {
      return res.status(404).json({ message: 'Conversation not found or access denied' });
    }

    // Determine receiver
    let recipientUserId = receiverId;
    if (!recipientUserId) {
      const otherParticipant = conv.participants.find(
        (p) => p.toString() !== req.user._id.toString()
      );
      recipientUserId = otherParticipant ? otherParticipant.toString() : req.user._id.toString();
    }

    // Determine encrypted fields
    const cipherTextData = ciphertext || (payload && payload.ciphertext) || content || '';
    const ivData = iv || (payload && payload.iv) || '';
    const wrappedKeyData = wrappedKey || (payload && payload.wrappedKey) || '';

    // The display content in DB is strictly ciphertext or encrypted label
    const storedContent = cipherTextData || (typeof content === 'string' ? content : '🔒 [Encrypted SMS]');

    const newMsg = await Message.create({
      conversation: conv._id,
      sender: req.user._id,
      receiver: recipientUserId,
      receiverKey: receiverKey || '',
      receiverFingerprint: receiverFingerprint || '',
      content: storedContent,
      ciphertext: cipherTextData,
      iv: ivData,
      wrappedKey: wrappedKeyData,
      plaintext: '', // Plaintext is NOT stored in DB for privacy!
      payload: payload || {
        ciphertext: cipherTextData,
        iv: ivData,
        wrappedKey: wrappedKeyData,
        algorithm: algorithm || 'DES + ElGamal',
      },
      encrypted: encrypted !== false,
      algorithm: algorithm || 'DES + ElGamal',
      status: 'delivered',
    });

    // Update conversation lastMessage & unread count
    conv.lastMessage = {
      content: '🔒 Encrypted message',
      preview: '🔒 Encrypted message',
      senderId: req.user._id.toString(),
      createdAt: newMsg.createdAt,
    };

    const currentUnread = conv.unreadCounts?.get(recipientUserId) || 0;
    conv.unreadCounts.set(recipientUserId, currentUnread + 1);
    await conv.save();

    res.status(201).json(newMsg);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a message as read
// @route   PATCH /api/messages/:id/read or PUT /api/messages/:id/read
// @access  Private
export const markMessageAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const msg = await Message.findById(id);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (msg.receiver.toString() === req.user._id.toString()) {
      msg.status = 'read';
      await msg.save();
    }

    res.json({ success: true, message: 'Message marked as read', id });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:id
// @access  Private
export const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const msg = await Message.findOne({
      _id: id,
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    });

    if (!msg) {
      return res.status(404).json({ message: 'Message not found or not authorized' });
    }

    await msg.deleteOne();
    res.json({ success: true, message: 'Message deleted successfully', id });
  } catch (error) {
    next(error);
  }
};
