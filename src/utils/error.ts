import express from 'express';
import { z } from 'zod';

// ----------------------------------------------------------------------

export class FluxuError extends Error {
  status;
  message;
  error;

  constructor({
    status,
    message,
    error,
  }: {
    status: number;
    message: string;
    error?: unknown;
  }) {
    super(message);
    this.name = this.constructor.name;
    //
    this.message = message;
    this.status = status;
    this.error = error;
  }
}

// ----------------------------------------------------------------------

export const errorHandler = ({
  origin,
  error,
  res,
}: {
  origin: string;
  error: unknown;
  res?: express.Response;
}) => {
  if (error instanceof z.ZodError) {
    res?.status(400).json({
      message: 'Requisição inválida.',
      invalidFields: error.issues.map((e) => e.path.join('.')),
    });
    return;
  }

  if (error instanceof FluxuError) {
    res?.status(error.status).json({ message: error.message });
    if (error.status >= 500) {
      console.error(`[Fluxu] Error (${origin}): `, error);
    }
    return;
  }

  console.error(`[Fluxu] Error (${origin}): `, error);
  res?.status(500).json({ message: 'Ocorreu um erro inesperado.' });
};

// ----------------------------------------------------------------------

export const errorParser = (
  error: unknown,
): { type: string; message: string; error: string } => {
  if (error instanceof FluxuError) {
    return {
      type: 'FluxuError',
      message: error.message,
      error: JSON.stringify(
        error.error,
        Object.getOwnPropertyNames(error.error),
      ),
    };
  }
  if (error instanceof Error) {
    return {
      type: 'Error',
      message: error.message,
      error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    };
  }
  return {
    type: 'unknown',
    message: 'unknown',
    error:
      typeof error === 'object'
        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
        : JSON.stringify(error),
  };
};
