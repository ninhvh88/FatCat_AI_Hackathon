import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// Logging Middleware
// Structured logs with correlationId
// ============================================================

export function correlationId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-correlation-id'] as string) || uuidv4();
  (req as any).correlationId = id;
  res.setHeader('x-correlation-id', id);
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const originalSend = res.send;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      event: 'http.request',
      correlationId: (req as any).correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    };
    console.log(JSON.stringify(logData));
  });

  next();
}
