const User = require('../models/User');

/**
 * Middleware to check if user is authenticated
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * Middleware to check if user is an admin
 */
const requireAdmin = async (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await User.findById(req.session.user.id);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Error checking admin permission:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Middleware to check if user is a manager
 */
const requireManager = async (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await User.findById(req.session.user.id);
    if (!user || (!user.is_admin && !user.is_manager)) {
      return res.status(403).json({ error: 'Manager or admin access required' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Error checking manager permission:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Middleware to check if user can view a specific target user's data
 * Admins can see everyone, managers can see their team
 */
const canViewUser = async (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const viewerId = req.session.user.id;
    const targetUserId = parseInt(req.params.userId || req.params.id);

    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const canView = await User.canViewUser(viewerId, targetUserId);
    if (!canView) {
      return res.status(403).json({ error: 'You do not have permission to view this user\'s data' });
    }

    // Attach viewer info to request
    req.user = await User.findById(viewerId);
    req.targetUserId = targetUserId;
    next();
  } catch (error) {
    console.error('Error checking view permission:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Middleware to filter accessible user IDs based on viewer permissions
 * Adds accessible user IDs to req.accessibleUserIds
 */
const filterAccessibleUsers = async (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const viewerId = req.session.user.id;
    const viewer = await User.findById(viewerId);
    req.user = viewer;

    // Get all accessible users
    const accessibleUsers = await User.getAccessibleUsers(viewerId);
    req.accessibleUserIds = accessibleUsers.map(u => u.id);

    next();
  } catch (error) {
    console.error('Error filtering accessible users:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Middleware to check if user can manage tags (admin only)
 */
const canManageTags = async (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await User.findById(req.session.user.id);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Only admins can manage tags' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Error checking tag management permission:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Middleware to check if user can edit another user
 * Admins can edit anyone, managers can edit their direct reports only
 */
const canEditUser = async (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const viewerId = req.session.user.id;
    const targetUserId = parseInt(req.params.userId || req.params.id);
    const viewer = await User.findById(viewerId);

    if (!viewer) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Admins can edit anyone
    if (viewer.is_admin) {
      req.user = viewer;
      req.targetUserId = targetUserId;
      return next();
    }

    // Managers can edit their direct reports
    if (viewer.is_manager) {
      const directReports = await User.getDirectReports(viewerId);
      const canEdit = directReports.some(report => report.id === targetUserId);

      if (canEdit) {
        req.user = viewer;
        req.targetUserId = targetUserId;
        return next();
      }
    }

    // Users can edit themselves (for limited fields)
    if (viewerId === targetUserId) {
      req.user = viewer;
      req.targetUserId = targetUserId;
      req.selfEdit = true;  // Flag to restrict editable fields
      return next();
    }

    return res.status(403).json({ error: 'You do not have permission to edit this user' });
  } catch (error) {
    console.error('Error checking edit permission:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireManager,
  canViewUser,
  filterAccessibleUsers,
  canManageTags,
  canEditUser
};
