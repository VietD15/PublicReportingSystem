import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';

const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack); // Log the error stack trace for debugging
  switch (err.statusCode) {
    case 400:
      return res.status(400).json({ message: err.message });
    case 401:
      return res.status(401).json({ message: 'Unauthorized' });
    case 403:
      return res.status(403).json({ message: 'Forbidden' });
    case 404:
      return res.status(404).json({ message: 'Not Found' });
    case 415:
      return res.status(415).json({ message: err.message });
    case 500:
      return res.status(500).json({ message: 'Internal Server Error' });
    default:
      next(err); // Pass the error to the default error handler
  }
}

export default errorHandler;