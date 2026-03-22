import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/apiResponse.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    return errorResponse(res, 400, errorMessages);
  }
  
  next();
};

export default validate;
