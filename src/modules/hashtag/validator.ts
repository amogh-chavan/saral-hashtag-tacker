import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const getHashtagMediaSchema = Joi.object({
  name: Joi.string().required().messages({
    'string.empty': "Missing 'name' query parameter (e.g., ?name=matcha)",
    'any.required': "Missing 'name' query parameter (e.g., ?name=matcha)"
  }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export const hashtagValidator = {
  getHashtagMedia: (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = getHashtagMediaSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true // Removes any query params not defined in the schema
    });

    if (error) {
      return res.status(400).json({ 
        error: "Validation Error", 
        details: error.details.map(err => err.message)
      });
    }

    // Assign the validated and type-casted values back to req.query
    // so the controller doesn't need to parse strings to numbers!
    req.query = value;
    next();
  }
};
