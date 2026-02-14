import { Request, Response, NextFunction } from 'express';

export interface AdminRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    accountId: string;
  };
}

export function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource',
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Admin access required',
      message: 'You do not have permission to access this resource',
    });
    return;
  }

  next();
}
