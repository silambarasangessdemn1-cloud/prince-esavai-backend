// 404 Not Found route handler
export const notFound = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global centralized error handler
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;
  let errorType = err.name;

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    message = `Duplicate value '${value}' entered for ${field}. Please use another value.`;
    errorType = 'DUPLICATE_KEY_ERROR';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    errorType = 'VALIDATION_ERROR';
  }

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found with id: ${err.value}`;
    errorType = 'RESOURCE_NOT_FOUND';
  }

  res.status(statusCode).json({
    success: false,
    error: errorType,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

