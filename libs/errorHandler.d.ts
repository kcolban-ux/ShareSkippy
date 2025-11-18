export class APIError extends Error {
    readonly statusCode: number;
    readonly code: string | null;
    constructor(message: string, statusCode?: number, code?: string | null);
}

export type APIErrorResponse = {
    error: string;
    status: number;
    code?: string | null;
};

export function handleAPIError(
    error: unknown,
    request: Request,
): APIErrorResponse;

export function withErrorHandling<
    Context extends Record<string, unknown> = Record<string, unknown>,
>(
    handler: (request: Request, context: Context) => Promise<Response>,
): (request: Request, context: Context) => Promise<Response>;

export function createErrorResponse(
    message: string,
    status?: number,
    code?: string | null,
): Response;
export function createSuccessResponse<T>(data: T, status?: number): Response;
