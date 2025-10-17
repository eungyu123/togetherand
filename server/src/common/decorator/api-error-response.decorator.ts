// swagger/api-error-response.decorator.ts
import { applyDecorators } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";

export function ApiErrorResponse(status: number, description: string, exampleMessage: string) {
  return applyDecorators(
    ApiResponse({
      status,
      description,
      schema: {
        example: {
          success: false,
          statusCode: status,
          message: exampleMessage,
          error: description,
          timestamp: new Date().toISOString(),
        },
      },
    })
  );
}
