import { errorResponse } from '../utils/apiResponse.js';

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(', ');
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('\n⚠️ === ERROR HANDLER ===');
    console.error('Status Code:', statusCode);
    console.error('Message:', message);
    console.error('Error Name:', err.name);
    console.error('Error Stack:', err.stack);
    console.error('=== END ERROR HANDLER ===\n');
  }

  return errorResponse(res, statusCode, message);
};

export default errorHandler;
