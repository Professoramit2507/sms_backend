import Conversation from '../models/Conversation.js';
import User from '../models/User.js';

// @desc    Get all conversations for logged in user
// @route   GET /api/conversations
// @access  Private
export const getConversations = async (req, res, next) => {
  try {
    const currentUserId = req.user._id.toString();

    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'fullName username email avatar')
      .sort({ updatedAt: -1 });

    const formatted = conversations.map((conv) => {
      // Find the other participant
      const other = conv.participants.find(
        (p) => p._id.toString() !== currentUserId
      ) || conv.participants[0];

      const unread = conv.unreadCounts?.get(currentUserId) || 0;

      return {
        id: conv._id.toString(),
        participantId: other ? other._id.toString() : null,
        participant: other
          ? {
              id: other._id.toString(),
              fullName: other.fullName,
              username: other.username,
              email: other.email,
              avatar: other.avatar,
            }
          : null,
        lastMessage: conv.lastMessage || null,
        unreadCount: unread,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
      };
    });

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

// @desc    Create or get existing conversation with user
// @route   POST /api/conversations
// @access  Private
export const createConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: 'recipientId is required' });
    }

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }

    // Check if conversation already exists between these 2 users
    let conv = await Conversation.findOne({
      participants: { $all: [req.user._id, recipient._id], $size: 2 },
    }).populate('participants', 'fullName username email avatar');

    if (!conv) {
      conv = await Conversation.create({
        participants: [req.user._id, recipient._id],
        lastMessage: null,
        unreadCounts: {
          [req.user._id.toString()]: 0,
          [recipient._id.toString()]: 0,
        },
      });

      conv = await Conversation.findById(conv._id).populate(
        'participants',
        'fullName username email avatar'
      );
    }

    const other = conv.participants.find(
      (p) => p._id.toString() !== req.user._id.toString()
    ) || recipient;

    res.status(201).json({
      id: conv._id.toString(),
      participantId: other._id.toString(),
      participant: {
        id: other._id.toString(),
        fullName: other.fullName,
        username: other.username,
        email: other.email,
        avatar: other.avatar,
      },
      lastMessage: conv.lastMessage,
      unreadCount: 0,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
export const getConversationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const conv = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
    }).populate('participants', 'fullName username email avatar');

    if (!conv) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const other = conv.participants.find(
      (p) => p._id.toString() !== req.user._id.toString()
    );

    res.json({
      id: conv._id.toString(),
      participantId: other ? other._id.toString() : null,
      participant: other
        ? {
            id: other._id.toString(),
            fullName: other.fullName,
            username: other.username,
            email: other.email,
            avatar: other.avatar,
          }
        : null,
      lastMessage: conv.lastMessage,
      unreadCount: conv.unreadCounts?.get(req.user._id.toString()) || 0,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
    });
  } catch (error) {
    next(error);
  }
};
