import { openApiRoutes, type HttpMethod, type OpenApiRouteDefinition } from './openapiRoutes';

type OpenApiPathItem = Record<string, Record<string, unknown>>;

function roleDescription(security: OpenApiRouteDefinition['security']): string {
  if (security === false || security === undefined) return 'Public endpoint.';
  if (security === true) return 'Requires a valid JWT bearer token.';
  return `Requires JWT bearer token with role(s): ${security.join(', ')}.`;
}

function buildOperation(route: OpenApiRouteDefinition) {
  const operation: Record<string, unknown> = {
    tags: [route.tag],
    summary: route.summary,
    description: roleDescription(route.security),
    responses: {
      '200': {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiResponse' },
          },
        },
      },
      '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      '500': { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    },
  };

  if (route.security !== false) {
    operation.security = [{ bearerAuth: [] }];
  }

  if (['post', 'put', 'patch'].includes(route.method)) {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object', additionalProperties: true },
        },
      },
    };
  }

  if (route.method === 'post' && route.path.startsWith('/api/files')) {
    operation.requestBody = {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              file: { type: 'string', format: 'binary' },
            },
          },
        },
      },
    };
  }

  return operation;
}

function buildPaths(): OpenApiPathItem {
  const paths: OpenApiPathItem = {};

  for (const route of openApiRoutes) {
    if (!paths[route.path]) {
      paths[route.path] = {};
    }
    paths[route.path][route.method] = buildOperation(route);
  }

  return paths;
}

const serverUrl =
  process.env.API_PUBLIC_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://umbrella-academy-backend.onrender.com'
    : `http://localhost:${process.env.PORT || 5000}`);

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Dreamize API',
    version: '1.0.0',
    description:
      'REST API for the Dreamize LMS — authentication, roadmaps, projects, bookings, payments, chat, and admin tools.\n\n' +
      'Authenticate via `POST /api/auth/login`, then use **Authorize** with `Bearer <token>`.',
    contact: {
      email: 'hello@dreamize.rw',
    },
  },
  servers: [{ url: serverUrl, description: process.env.NODE_ENV === 'production' ? 'Production' : 'Local development' }],
  tags: [
    { name: 'Health', description: 'Service health' },
    { name: 'Auth', description: 'Registration, login, OTP, password reset' },
    { name: 'Users', description: 'User management' },
    { name: 'Trainers', description: 'Trainer profiles and availability' },
    { name: 'Roadmaps', description: 'Learning roadmaps and milestones' },
    { name: 'Projects', description: 'Student projects' },
    { name: 'Bookings', description: 'Session bookings' },
    { name: 'Payments', description: 'Orientation and subscription payments' },
    { name: 'Chat', description: 'Messaging' },
    { name: 'Certificates', description: 'Certificates' },
    { name: 'Notifications', description: 'In-app notifications' },
    { name: 'Files', description: 'File uploads' },
    { name: 'Guardian', description: 'Guardian invitations and dashboard' },
    { name: 'Admin', description: 'Admin operations' },
    { name: 'Promo Codes', description: 'Promotional codes' },
    { name: 'Public', description: 'Public endpoints' },
    { name: 'Sales', description: 'Sales manager tools' },
    { name: 'System', description: 'System monitoring' },
    { name: 'Stats', description: 'Dashboard statistics' },
  ],
  paths: buildPaths(),
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT from POST /api/auth/login or registration response',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed' },
          data: { type: 'object', nullable: true },
        },
        required: ['success', 'message'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message' },
        },
        required: ['success', 'message'],
      },
    },
  },
};

export type OpenApiSpec = typeof openApiSpec;
