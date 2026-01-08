/* eslint-disable no-unused-vars */

export function validateEmail(email: unknown): boolean;
export function validatePhoneNumber(phone: string): boolean;
export function validateRequired(value: unknown, fieldName: string): boolean;
export function validateStringLength(
  value: unknown,
  fieldName: string,
  minLength?: number,
  maxLength?: number
): boolean;
export function validateDate(date: string | number | Date | undefined, fieldName: string): Date;
export function validateFutureDate(
  date: string | number | Date | undefined,
  fieldName: string
): Date;
export function validateUUID(uuid: string, fieldName: string): boolean;
export function validateEnum(value: string, fieldName: string, allowedValues: string[]): boolean;
export function validateNumber(
  value: string | number | null | undefined,
  fieldName: string,
  min?: number | null,
  max?: number | null
): number;
export function validateArray(
  value: unknown,
  fieldName: string,
  minLength?: number,
  maxLength?: number | null
): boolean;

export type ValidationSchema = Record<string, (value: unknown) => unknown>;

export const meetingValidationSchema: ValidationSchema;
export const reviewValidationSchema: ValidationSchema;
export const profileValidationSchema: ValidationSchema;

export function validateRequestBody(
  body: Record<string, unknown>,
  schema: ValidationSchema
): boolean;
