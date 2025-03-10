/**
 * PerchPics Error Handling Utilities
 * 
 * This file provides custom error classes and error handling utilities
 * for consistent error management across the application.
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
    
    // Ensure instanceof works correctly in ES5
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * API-specific error class
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    public statusCode: number = 500,
    code: string = 'API_ERROR'
  ) {
    super(message, code);
    this.name = 'ApiError';
    
    // Ensure instanceof works correctly in ES5
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Authentication error class
 */
export class AuthError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    code: string = 'AUTH_ERROR'
  ) {
    super(message, code);
    this.name = 'AuthError';
    
    // Ensure instanceof works correctly in ES5
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
    code: string = 'VALIDATION_ERROR'
  ) {
    super(message, code);
    this.name = 'ValidationError';
    
    // Ensure instanceof works correctly in ES5
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Format an error for display to the user
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
}

/**
 * Log an error to the console with additional context
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  if (error instanceof AppError) {
    console.error(`[${error.name}] ${error.code}: ${error.message}`, context);
    return;
  }
  
  if (error instanceof Error) {
    console.error(`[Error] ${error.name}: ${error.message}`, context);
    return;
  }
  
  console.error('[Unknown Error]', error, context);
} 