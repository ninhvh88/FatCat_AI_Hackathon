import { Request, Response, NextFunction } from 'express';

// ============================================================
// Error Handler Middleware
// ============================================================

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(JSON.stringify({
    event: 'error',
    correlationId: (req as any).correlationId,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  }));

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    correlationId: (req as any).correlationId,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
}
