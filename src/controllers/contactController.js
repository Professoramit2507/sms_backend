import Contact from '../models/Contact.js';
import User from '../models/User.js';

// @desc    Get all contacts for current user
// @route   GET /api/contacts
// @access  Private
export const getContacts = async (req, res, next) => {
  try {
    const contacts = await Contact.find({ user: req.user._id }).populate(
      'contactUser',
      'fullName username email role avatar createdAt'
    );

    const formatted = contacts
      .filter((c) => c.contactUser) // Ensure user wasn't deleted
      .map((c) => ({
        id: c.contactUser._id.toString(),
        contactRecordId: c._id.toString(),
        fullName: c.contactUser.fullName,
        username: c.contactUser.username,
        email: c.contactUser.email,
        role: c.contactUser.role || 'sender',
        avatar: c.contactUser.avatar,
        nickname: c.nickname || c.contactUser.fullName,
      }));

    res.json({ contacts: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a contact by email or username
// @route   POST /api/contacts
// @access  Private
export const addContact = async (req, res, next) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ message: 'Please provide email or username to add contact' });
    }

    const cleanId = identifier.trim().toLowerCase();

    // Prevent adding self
    if (
      cleanId === req.user.email.toLowerCase() ||
      cleanId === req.user.username.toLowerCase() ||
      cleanId === req.user._id.toString()
    ) {
      return res.status(400).json({ message: 'You cannot add yourself as a contact' });
    }

    const targetUser = await User.findOne({
      $or: [{ email: cleanId }, { username: cleanId }],
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found with this email or username' });
    }

    const existing = await Contact.findOne({
      user: req.user._id,
      contactUser: targetUser._id,
    });

    if (existing) {
      return res.status(400).json({ message: 'Contact is already in your contacts list' });
    }

    const newContact = await Contact.create({
      user: req.user._id,
      contactUser: targetUser._id,
    });

    res.status(201).json({
      contact: {
        id: targetUser._id.toString(),
        contactRecordId: newContact._id.toString(),
        fullName: targetUser.fullName,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role || 'sender',
        avatar: targetUser.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a contact
// @route   DELETE /api/contacts/:id
// @access  Private
export const removeContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Could be either Contact _id or contactUser _id
    let deleted;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      deleted = await Contact.findOneAndDelete({
        user: req.user._id,
        $or: [{ _id: id }, { contactUser: id }],
      });
    }

    if (!deleted) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({ success: true, message: 'Contact removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get contact profile
// @route   GET /api/contacts/:id
// @access  Private
export const getContactProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    let targetUser;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(id).select('-password');
    } else {
      targetUser = await User.findOne({ username: id.toLowerCase() }).select('-password');
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({
      contact: {
        id: targetUser._id.toString(),
        fullName: targetUser.fullName,
        username: targetUser.username,
        email: targetUser.email,
        avatar: targetUser.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};
