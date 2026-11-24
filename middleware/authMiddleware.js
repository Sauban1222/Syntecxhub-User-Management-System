import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  const authorization = req.get('authorization');
  const tokenMatch =
    typeof authorization === 'string'
      ? /^Bearer\s+(\S+)$/i.exec(authorization)
      : null;

  if (!tokenMatch) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const secret = process.env.JWT_SECRET;
  if (
    typeof secret !== 'string' ||
    Buffer.byteLength(secret, 'utf8') < 32
  ) {
    return res.status(503).json({
      success: false,
      message: 'Authentication service is temporarily unavailable',
    });
  }

  try {
    const payload = jwt.verify(tokenMatch[1], secret, {
      algorithms: ['HS256'],
    });

    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.sub !== 'string' ||
      !payload.sub
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    req.user = { id: payload.sub };
    return next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    return next(error);
  }
}
