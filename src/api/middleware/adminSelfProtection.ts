import { Response, NextFunction } from 'express';
import { AdminRequest } from './requireAdmin';

export function adminSelfProtection(req: AdminRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
    });
    return;
  }

  const targetUserId = req.params.id || req.params.userId;

  if (!targetUserId) {
    next();
    return;
  }

  const dangerousActions = [
    'suspend',
    'demote',
    'delete',
    'ban',
    'restrict',
  ];

  const actionPath = req.path.split('/').pop();
  const isDangerousAction = dangerousActions.some(action => 
    actionPath?.includes(action) || req.path.includes(action)
  );

  if (isDangerousAction && targetUserId === req.user.id) {
    res.status(403).json({
      error: 'Self-modification not allowed',
      message: 'You cannot perform this action on your own account',
    });
    return;
  }

  next();
}
