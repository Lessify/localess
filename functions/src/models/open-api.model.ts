export interface GenerateOpenApiData {
  spaceId: string;
}

export interface OpenApiSchema {
  openapi: string;
  info: OpenApiInfoSchema;
  jsonSchemaDialect?: 'https://spec.openapis.org/oas/3.1/dialect/base';
  servers?: OpenApiServerSchema[];
  paths?: Record<string, OpenApiPathItemSchema>;
  webhooks?: string;
  components?: {
    schemas?: Record<string, OpenApiSchemaDefinition>;
    securitySchemes?: Record<string, OpenApiSecurityScheme>;
  };
  security?: OpenApiSecurityRequirement;
  tags?: string;
  externalDocs?: {
    url: string;
    description?: string;
  };
}

export type OpenApiInfoSchema = {
  title: string;
  summary?: string;
  description?: string;
  termsOfService?: string;
  contact: {
    name?: string;
    url?: string;
    email?: string;
  };
  license: {
    name: string;
    identifier?: string;
    url?: string;
  };
  version: string;
};

export type OpenApiServerSchema = {
  url: string;
  description?: string;
  variables?: Record<string, OpenApiServerVariableSchema>;
};

export type OpenApiServerVariableSchema = {
  enum?: string[];
  default: string;
  description?: string;
};

export type OpenApiPathItemSchema = {
  summary?: string;
  description?: string;
  servers?: OpenApiServerSchema[];
  parameters?: OpenApiPathParameterSchema[];
  get?: OpenApiPathOperationSchema;
  put?: OpenApiPathOperationSchema;
  post?: OpenApiPathOperationSchema;
  delete?: OpenApiPathOperationSchema;
  options?: OpenApiPathOperationSchema;
  head?: OpenApiPathOperationSchema;
  path?: OpenApiPathOperationSchema;
  trace?: OpenApiPathOperationSchema;
};

export type OpenApiPathParameterSchema = {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: OpenApiSchemaDefinition;
  content?: boolean; //
};

export type OpenApiPathOperationSchema = {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: string; // TODO
  operationId?: string;
  parameters?: OpenApiPathParameterSchema[];
  requestBody?: string; // TODO
  responses?: Record<'200', OpenApiPathOperationResponseSchema>;
  callbacks?: string; // TODO
  deprecated?: boolean;
  security?: OpenApiSecurityRequirement;
  servers?: string; // TODO
};

export type ContentMediaType = 'application/json' | 'application/*' | 'image/*' | string;

export type OpenApiPathOperationResponseSchema = {
  description: string;
  headers?: string; // TODO
  content?: Record<ContentMediaType, { schema: OpenApiSchemaDefinition }>;
  links?: string; // TODO
};

export type OpenApiSchemaRef = { $ref: string };
export type OpenApiSecurityRequirement = Record<string, string[]>[];
export type OpenApiSecurityScheme = {
  type: 'apiKey' | 'http' | 'mutualTLS' | 'oauth2' | 'openIdConnect';
  description?: string;
  name: string;
  in: 'query' | 'header' | 'cookie';
};
export type OpenApiSchemaDefinition =
  | OpenApiSchemaRef
  | {
      type: 'object';
      title?: string;
      description?: string;
      properties: Record<string, OpenApiSchemaDefinition>;
      required?: string[];
      example?: Record<string, string | object>;
    }
  | {
      type: 'object';
      title?: string;
      description?: string;
      additionalProperties: OpenApiSchemaDefinition;
      required?: string[];
      example?: Record<string, string | object>;
    }
  | {
      type: 'string';
      format?: 'date' | 'date-time' | 'regex' | 'uri' | 'email' | 'uri-reference' | 'uuid' | 'color' | 'binary' | 'byte' | string;
      title?: string;
      description?: string;
      example?: string;
      default?: string;
      enum?: string[];
      minLength?: number;
      maxLength?: number;
    }
  | {
      type: 'number';
      title?: string;
      format?: 'float' | 'double';
      example?: number;
      minimum?: number;
      maximum?: number;
      description?: string;
      default?: number;
    }
  | {
      type: 'integer';
      title?: string;
      format?: 'int32' | 'int64';
      example?: number;
      minimum?: number;
      maximum?: number;
      description?: string;
      default?: number;
    }
  | {
      type: 'boolean';
      title?: string;
      description?: string;
      default?: boolean;
      example?: boolean;
    }
  | {
      type: 'array';
      title?: string;
      minItems?: number;
      maxItems?: number;
      items:
        | {
            type: 'string';
            enum?: string[];
          }
        | OpenApiSchemaRef
        | {
            description?: string;
            discriminator?: {
              propertyName: string;
            };
            oneOf: OpenApiSchemaRef[];
          };
      description?: string;
    }
  | {
      description?: string;
      oneOf: OpenApiSchemaRef[];
      discriminator?: {
        propertyName: string;
      };
    }
  | {
      description?: string;
      allOf: OpenApiSchemaRef[];
    }
  | {
      description?: string;
      anyOf: OpenApiSchemaRef[];
    };
