import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        console.error('--- EXCEPTION CAUGHT BY FILTER ---');
        console.error(exception);

        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        const errorResponse = {
            success: false,
            message: typeof message === 'string' ? message : (message as any).message || 'Error occurred',
            error: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : (message as any).error,
            statusCode: status,
            path: request.url,
            timestamp: new Date().toISOString(),
        };

        response.status(status).json(errorResponse);
    }
}
