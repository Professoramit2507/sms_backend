import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a new user (Sender or Receiver)
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { fullName, username, email, password, role } = req.body;

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const userRole = role === 'receiver' ? 'receiver' : 'sender';

    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }],
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === cleanEmail
            ? 'An account with this email already exists'
            : 'Username is already taken',
      });
    }

    const user = await User.create({
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password,
      role: userRole,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { identifier, email, username, password } = req.body;
    const loginId = (identifier || email || username || '').trim().toLowerCase();

    if (!loginId || !password) {
      return res.status(400).json({ message: 'Please provide identifier/email and password' });
    }

    const user = await User.findOne({
      $or: [{ email: loginId }, { username: loginId }],
    }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials. Check your email/username and password.' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role || 'sender',
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me or GET /api/users/me
// @access  Private
export const getMe = async (req, res) => {
  res.json({
    user: {
      id: req.user._id.toString(),
      fullName: req.user.fullName,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role || 'sender',
      avatar: req.user.avatar,
      createdAt: req.user.createdAt,
    },
  });
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
export const refreshToken = async (req, res) => {
  const token = generateToken(req.user._id);
  res.json({
    token,
    user: {
      id: req.user._id.toString(),
      fullName: req.user.fullName,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role || 'sender',
      avatar: req.user.avatar,
      createdAt: req.user.createdAt,
    },
  });
};

// @desc    Update current user profile
// @route   PUT /api/users/me
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, avatar, role } = req.body;
    const user = await User.findById(req.user._id);

    if (fullName) user.fullName = fullName.trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (role && (role === 'sender' || role === 'receiver')) user.role = role;

    const updatedUser = await user.save();

    res.json({
      user: {
        id: updatedUser._id.toString(),
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role || 'sender',
        avatar: updatedUser.avatar,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/users/me/password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};
