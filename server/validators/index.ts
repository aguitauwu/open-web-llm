import { body, query, param, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

// Middleware para manejar errores de validación
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}

// Validadores para conversaciones
export const validateCreateConversation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: config.validation.maxTitleLength })
    .withMessage(`Title must be between 1 and ${config.validation.maxTitleLength} characters`)
    .escape(),
  body('model')
    .trim()
    .isLength({ min: 1, max: config.validation.maxModelNameLength })
    .withMessage(`Model name must be between 1 and ${config.validation.maxModelNameLength} characters`)
    .matches(/^[a-zA-Z0-9\s\.\-]+$/)
    .withMessage('Model name contains invalid characters'),
  handleValidationErrors
];

export const validateUpdateConversation = [
  param('id')
    .isUUID()
    .withMessage('Invalid conversation ID format'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: config.validation.maxTitleLength })
    .withMessage(`Title must be between 1 and ${config.validation.maxTitleLength} characters`)
    .escape(),
  handleValidationErrors
];

// Validadores para mensajes
export const validateCreateMessage = [
  body('conversationId')
    .isUUID()
    .withMessage('Invalid conversation ID format'),
  body('role')
    .isIn(['user', 'assistant'])
    .withMessage('Role must be either "user" or "assistant"'),
  body('content')
    .trim()
    .isLength({ min: 1, max: config.validation.maxPromptLength })
    .withMessage(`Content must be between 1 and ${config.validation.maxPromptLength} characters`)
    .custom((value) => {
      // Validación básica contra inyección de prompts
      const suspiciousPatterns = [
        /ignore\s+previous\s+instructions/i,
        /system\s*:/i,
        /assistant\s*:/i,
        /<\s*script/i,
        /javascript:/i,
        /eval\s*\(/i,
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          throw new Error('Content contains potentially malicious patterns');
        }
      }
      return true;
    }),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be a valid object'),
  handleValidationErrors
];

// Validadores para búsquedas
export const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: config.validation.maxSearchQueryLength })
    .withMessage(`Search query must be between 1 and ${config.validation.maxSearchQueryLength} characters`)
    .escape()
    .custom((value) => {
      // Prevenir búsquedas maliciosas
      const blockedPatterns = [
        /site:\s*file:/i,
        /inurl:\s*javascript:/i,
        /\.\./,
        /<script/i,
      ];
      
      for (const pattern of blockedPatterns) {
        if (pattern.test(value)) {
          throw new Error('Search query contains blocked patterns');
        }
      }
      return true;
    }),
  query('type')
    .optional()
    .isIn(['web', 'youtube', 'images'])
    .withMessage('Search type must be web, youtube, or images'),
  handleValidationErrors
];

// Validadores para parámetros de ID
export const validateUUIDParam = (paramName: string) => [
  param(paramName)
    .isUUID()
    .withMessage(`Invalid ${paramName} format`),
  handleValidationErrors
];

// Validador para AI prompts
export const validateAIPrompt = [
  body('prompt')
    .trim()
    .isLength({ min: 1, max: config.validation.maxPromptLength })
    .withMessage(`Prompt must be between 1 and ${config.validation.maxPromptLength} characters`)
    .custom((value) => {
      // Anti-prompt injection patterns
      const dangerousPatterns = [
        /ignore\s+all\s+previous/i,
        /forget\s+everything/i,
        /new\s+instructions/i,
        /system\s+message/i,
        /developer\s+mode/i,
        /admin\s+override/i,
        /jailbreak/i,
        /bypass\s+safety/i,
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          throw new Error('Prompt contains potentially harmful instructions');
        }
      }
      return true;
    }),
  body('model')
    .trim()
    .isLength({ min: 1, max: config.validation.maxModelNameLength })
    .withMessage(`Model name must be between 1 and ${config.validation.maxModelNameLength} characters`)
    .matches(/^[a-zA-Z0-9\s\.\-]+$/)
    .withMessage('Model name contains invalid characters'),
  handleValidationErrors
];

// Sanitizar entrada de texto
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remover caracteres HTML básicos
    .replace(/javascript:/gi, '') // Remover javascript: URIs
    .replace(/on\w+\s*=/gi, '') // Remover event handlers
    .trim();
}

// Validar y sanitizar prompts antes de enviar a IA
export function sanitizePrompt(prompt: string): string {
  let sanitized = sanitizeText(prompt);
  
  // Remover intentos de manipular el sistema
  sanitized = sanitized.replace(/\bsystem\s*:\s*/gi, 'user said: ');
  sanitized = sanitized.replace(/\bassistant\s*:\s*/gi, 'user mentioned: ');
  
  return sanitized;
}