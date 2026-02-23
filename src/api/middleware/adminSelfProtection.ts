import { Response, NextFunction } from 'express';
import { AdminRequest } from './requireAdmin';

export function adminSelfProtection(req: AdminRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
    });
    return;
  }

  // Guard against undefined params
  const params = req.params ?? {};
  const targetUserId = params.id || params.userId;

  if (!targetUserId) {
    next();
    return;
  }

  // When the request path is undefined, we cannot assess the action — allow through
  if (!req.path) {
    next();
    return;
  }

  // Block any operation that targets the authenticated admin's own account
  if (targetUserId === req.user.id) {
    res.status(403).json({
      error: 'Self-modification not allowed',
      message: 'You cannot perform this action on your own account',
    });
    return;
  }

  next();
}
