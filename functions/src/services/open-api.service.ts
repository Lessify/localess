import { OpenApiSchema, OpenApiSchemaDefinition, Schema, SchemaField, SchemaFieldKind, SchemaType } from '../models';

/**
 * Generate Open API
 * @param {Map<string, Schema>} schemasById
 * @return {OpenApiSchema} OpenApiSchema
 */
export function generateOpenApi(schemasById: Map<string, Schema>): OpenApiSchema {
  const schemasDefinition: Record<string, OpenApiSchemaDefinition> = {
    Translations: {
      description: 'Key-Value Object. Where Key is Translation ID and Value is Translated Content',
      type: 'object',
      additionalProperties: {
        type: 'string',
        description: 'Translation Content',
        example: 'Email',
      },
      example: {
        'login.email': 'Email',
        'login.password': 'Password',
      },
    },
    ContentAsset: {
      type: 'object',
      description: 'Localess defined Object for Content Asset',
      required: ['kind', 'uri'],
      properties: {
        kind: {
          type: 'string',
          description: 'Define the type of Asset',
          enum: ['ASSET'],
        },
        uri: {
          type: 'string',
          format: 'uri',
          description: 'Unique identifier for the asset.',
          example: 'WLWc4vOACzG1QjK9AEo9',
        },
      },
    },
    ContentLink: {
      type: 'object',
      description: 'Localess defined Object for Content Link',
      required: ['kind', 'type', 'target', 'uri'],
      properties: {
        kind: {
          type: 'string',
          description: 'Define the type of Link',
          enum: ['LINK'],
        },
        type: {
          type: 'string',
          description: 'Define the type of Link. URL for external links and Content for internal links.',
          enum: ['url', 'content'],
        },
        target: {
          type: 'string',
          description: 'Define the target of the link. _blank for new tab and _self for same tab.',
          enum: ['_blank', '_self'],
        },
        uri: {
          type: 'string',
          format: 'uri',
          example: 'WLWc4vOACzG1QjK9AEo9',
          description: 'If type is content, then it will be Content ID. Otherwise it will be URL.',
        },
      },
    },
    ContentReference: {
      type: 'object',
      description: 'Localess defined Object for Content Reference',
      required: ['kind', 'uri'],
      properties: {
        kind: {
          type: 'string',
          description: 'Define the type of REFERENCE',
          enum: ['REFERENCE'],
        },
        uri: {
          type: 'string',
          format: 'uri',
          description: 'Unique identifier for the Content Document.',
          example: 'WLWc4vOACzG1QjK9AEo9',
        },
      },
    },
    Content: {
      type: 'object',
      description: 'Localess defined object for Content',
      required: ['id', 'kind', 'name', 'slug', 'parentSlug', 'fullSlug', 'createdAt', 'updatedAt'],
      properties: {
        id: {
          type: 'string',
          format: 'uri',
          description: 'Unique identifier for the object.',
          example: 'WLWc4vOACzG1QjK9AEo9',
        },
        kind: {
          type: 'string',
          description: 'Define the type of Content, whether it is a FOLDER or DOCUMENT.',
          enum: ['FOLDER', 'DOCUMENT'],
          example: 'DOCUMENT',
        },
        name: {
          type: 'string',
          description: 'Name of the Content',
          example: 'Privacy Policy',
        },
        slug: {
          type: 'string',
          description: 'SLUG of the Content',
          example: 'privacy-policy',
        },
        parentSlug: {
          type: 'string',
          description: 'Parent SLUG of the Content',
          example: 'legal',
        },
        fullSlug: {
          type: 'string',
          description: 'Combination of SLUG and Parent SLUG of the Content',
          example: 'legal/privacy-policy',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Date and Time at which the Content was created.',
          example: '2023-08-23T21:08:17.551Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Date and Time at which the Content was updated.',
          example: '2024-01-23T14:10:37.852Z',
        },
        publishedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Date and Time at which the Content was published.',
          example: '2023-08-23T21:09:15.191Z',
        },
        data: {
          $ref: '#/components/schemas/ContentData',
        },
      },
    },
    ContentMetadata: {
      type: 'object',
      description: 'Localess defined object for Content Metadata',
      required: ['id', 'kind', 'name', 'slug', 'parentSlug', 'fullSlug', 'createdAt', 'updatedAt'],
      properties: {
        id: {
          type: 'string',
          format: 'uri',
          description: 'Unique identifier for the object.',
          example: 'WLWc4vOACzG1QjK9AEo9',
        },
        kind: {
          type: 'string',
          description: 'Define the type of Content, whether it is a FOLDER or DOCUMENT.',
          enum: ['FOLDER', 'DOCUMENT'],
          example: 'DOCUMENT',
        },
        name: {
          type: 'string',
          description: 'Name of the Content',
          example: 'Privacy Policy',
        },
        slug: {
          type: 'string',
          description: 'SLUG of the Content',
          example: 'privacy-policy',
        },
        parentSlug: {
          type: 'string',
          description: 'Parent SLUG of the Content',
          example: 'legal',
        },
        fullSlug: {
          type: 'string',
          description: 'Combination of SLUG and Parent SLUG of the Content',
          example: 'legal/privacy-policy',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Date and Time at which the Content was created.',
          example: '2023-08-23T21:08:17.551Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Date and Time at which the Content was updated.',
          example: '2024-01-23T14:10:37.852Z',
        },
        publishedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Date and Time at which the Content was published.',
          example: '2023-08-23T21:09:15.191Z',
        },
      },
    },
    Links: {
      description: 'Key-Value Object. Where Key is Content ID and Value is Content Metadata',
      type: 'object',
      additionalProperties: {
        $ref: '#/components/schemas/ContentMetadata',
      },
    },
  };
  const rootSchemas: string[] = [];
  for (const [key, item] of schemasById.entries()) {
    if (item.type === SchemaType.ROOT) {
      const pascalName = key[0].toUpperCase() + key.slice(1);
      rootSchemas.push(pascalName);
    }
  }
  schemasDefinition['ContentData'] = {
    description: 'Localess defined Object to connect all possible root Schemas',
    oneOf: rootSchemas.map(it => {
      return {
        $ref: `#/components/schemas/${it}`,
      };
    }),
    discriminator: {
      propertyName: 'schema',
    },
  };

  for (const [id, item] of schemasById.entries()) {
    const [name, schema] = schemaToOpenApiSchemaDefinition(id, item);
    schemasDefinition[name] = schema;
  }

  const openApi: OpenApiSchema = {
    openapi: '3.0.3',
    info: {
      title: 'Localess Open API Specification',
      version: '2.0.0',
      description: 'Fetch data from Localess via REST API',
      contact: {
        name: 'Lessify Team',
        email: 'info@lessify.io',
        url: 'https://github.com/Lessify',
      },
      license: {
        name: 'MIT License',
        url: 'https://github.com/Lessify/localess/blob/main/LICENSE',
      },
    },
    externalDocs: {
      url: 'https://github.com/Lessify/localess/wiki',
      description: 'Localess Documentation',
    },
    paths: {
      '/api/v1/spaces/{spaceId}/translations/{locale}': {
        get: {
          tags: ['Translations'],
          summary: 'Get Translations by Locale',
          operationId: 'getTranslationsByLocale',
          parameters: [
            {
              name: 'spaceId',
              in: 'path',
              description: 'Space ID',
              required: true,
              schema: {
                type: 'string',
                example: 'UdV5ygPZuOD1JMO9Qat9',
              },
            },
            {
              name: 'locale',
              in: 'path',
              description: 'Translation Locale',
              required: true,
              schema: {
                type: 'string',
                example: 'en',
              },
            },
            {
              name: 'cv',
              in: 'query',
              description: 'Cache version',
              required: false,
              schema: {
                type: 'string',
                example: '1706217382028',
              },
            },
          ],
          responses: {
            '200': {
              description: 'success operation',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Translations',
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/spaces/{spaceId}/links': {
        get: {
          tags: ['Contents'],
          summary: 'Get Links to all Contents',
          operationId: 'getContentLinks',
          parameters: [
            {
              name: 'spaceId',
              in: 'path',
              description: 'Space ID',
              required: true,
              schema: {
                type: 'string',
                example: 'UdV5ygPZuOD1JMO9Qat9',
              },
            },
            {
              name: 'kind',
              in: 'query',
              description: 'Content Kind',
              required: false,
              schema: {
                type: 'string',
                enum: ['FOLDER', 'DOCUMENT'],
                example: 'DOCUMENT',
              },
            },
            {
              name: 'startSlug',
              in: 'query',
              description: 'Content start slug',
              required: false,
              schema: {
                type: 'string',
                example: 'legal/policy',
              },
            },
            {
              name: 'cv',
              in: 'query',
              description: 'Cache version',
              required: false,
              schema: {
                type: 'string',
                example: '1706217382028',
              },
            },
            {
              name: 'token',
              in: 'query',
              description: 'Authentication Token',
              required: true,
              schema: {
                type: 'string',
                example: 'fb6oTcVjbnyLCMhO2iLY',
              },
            },
          ],
          responses: {
            '200': {
              description: 'success operation',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Links',
                  },
                },
              },
            },
          },
          security: [
            {
              apikey: [],
            },
          ],
        },
      },
      '/api/v1/spaces/{spaceId}/contents/slugs/{contentSlug}': {
        get: {
          tags: ['Contents'],
          summary: 'Get Content by Slug',
          operationId: 'getContentBySlug',
          parameters: [
            {
              name: 'spaceId',
              in: 'path',
              description: 'Space ID',
              required: true,
              schema: {
                type: 'string',
                example: 'UdV5ygPZuOD1JMO9Qat9',
              },
            },
            {
              name: 'contentSlug',
              in: 'path',
              description: 'Content full slug',
              required: true,
              schema: {
                type: 'string',
                example: 'legal/policy',
              },
            },
            {
              name: 'cv',
              in: 'query',
              description: 'Cache version',
              required: false,
              schema: {
                type: 'string',
                example: '1706217382028',
              },
            },
            {
              name: 'locale',
              in: 'query',
              description: 'Locale',
              required: false,
              schema: {
                type: 'string',
                example: 'en',
              },
            },
            {
              name: 'version',
              in: 'query',
              description: 'Content version',
              required: false,
              schema: {
                type: 'string',
                enum: ['draft'],
                example: 'draft',
              },
            },
            {
              name: 'token',
              in: 'query',
              description: 'Authentication Token',
              required: true,
              schema: {
                type: 'string',
                example: 'fb6oTcVjbnyLCMhO2iLY',
              },
            },
          ],
          responses: {
            '200': {
              description: 'success operation',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Content',
                  },
                },
              },
            },
          },
          security: [
            {
              apikey: [],
            },
          ],
        },
      },
      '/api/v1/spaces/{spaceId}/contents/{contentId}': {
        get: {
          tags: ['Contents'],
          summary: 'Get Content By ID',
          operationId: 'getContentById',
          parameters: [
            {
              name: 'spaceId',
              in: 'path',
              description: 'Space ID',
              required: true,
              schema: {
                type: 'string',
                example: 'UdV5ygPZuOD1JMO9Qat9',
              },
            },
            {
              name: 'contentId',
              in: 'path',
              description: 'Content ID',
              required: true,
              schema: {
                type: 'string',
                example: '4ykrlCKwI7OCawK2T68g',
              },
            },
            {
              name: 'cv',
              in: 'query',
              description: 'Cache version',
              required: false,
              schema: {
                type: 'string',
                example: '1706217382028',
              },
            },
            {
              name: 'locale',
              in: 'query',
              description: 'Locale',
              required: false,
              schema: {
                type: 'string',
                example: 'en',
              },
            },
            {
              name: 'version',
              in: 'query',
              description: 'Content version',
              required: false,
              schema: {
                type: 'string',
                enum: ['draft'],
                example: 'draft',
              },
            },
            {
              name: 'token',
              in: 'query',
              description: 'Authentication Token',
              required: true,
              schema: {
                type: 'string',
                example: 'fb6oTcVjbnyLCMhO2iLY',
              },
            },
          ],
          responses: {
            '200': {
              description: 'success operation',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Content',
                  },
                },
              },
            },
          },
          security: [
            {
              apikey: [],
            },
          ],
        },
      },
      '/api/v1/spaces/{spaceId}/assets/{assetId}': {
        get: {
          tags: ['Assets'],
          summary: 'Get Asset By ID',
          operationId: 'getAssetById',
          parameters: [
            {
              name: 'spaceId',
              in: 'path',
              description: 'Space ID',
              required: true,
              schema: {
                type: 'string',
                example: 'UdV5ygPZuOD1JMO9Qat9',
              },
            },
            {
              name: 'assetId',
              in: 'path',
              description: 'Asset ID',
              required: true,
              schema: {
                type: 'string',
                example: 'UdV5ygPZuOD1JMO9Qat9',
              },
            },
            {
              name: 'w',
              in: 'query',
              description: 'Asset width, in case it is a image (In Pixel). Otherwise it will be ignored.',
              required: false,
              schema: {
                type: 'integer',
                example: 250,
              },
            },
            {
              name: 'download',
              in: 'query',
              description: 'In case you wish to download the asset',
              required: false,
              schema: {
                type: 'boolean',
                example: false,
              },
            },
          ],
          responses: {
            '200': {
              description: 'Returns Asset file',
              content: {
                'image/*': {
                  schema: {
                    type: 'string',
                    format: 'binary',
                  },
                },
                'application/*': {
                  schema: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: schemasDefinition,
      securitySchemes: {
        apikey: {
          type: 'apiKey',
          in: 'query',
          name: 'token',
        },
      },
    },
  };

  return openApi;
}

/**
 * Schema
 * @param {string} id - result
 * @param {Schema} schema - result
 * @return {OpenApiSchemaDefinition} asfdasf
 */
export function schemaToOpenApiSchemaDefinition(id: string, schema: Schema): [string, OpenApiSchemaDefinition] {
  const pascalName = id[0].toUpperCase() + id.slice(1);
  if (schema.type === SchemaType.ENUM) {
    return [
      pascalName,
      {
        type: 'string',
        enum: schema.values?.map(it => it.value),
      },
    ];
  }
  if (schema.type === SchemaType.NODE || schema.type === SchemaType.ROOT) {
    const required = ['_id', 'schema'];
    schema.fields?.filter(it => it.required === true).forEach(it => required.push(it.name));
    const schemasDefinition: Record<string, OpenApiSchemaDefinition> = {
      _id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique identifier of component in a content',
        example: 'a8ca3ed3-6613-4fb6-ae4e-5b846eb5775c',
      },
      schema: {
        type: 'string',
        enum: [id],
        description: 'Schema name',
      },
    };
    for (const item of schema.fields || []) {
      const [name, schema] = fieldToOpenApiSchemaDefinition(item);
      schemasDefinition[name] = schema;
    }
    return [
      pascalName,
      {
        type: 'object',
        required: required,
        properties: schemasDefinition,
      },
    ];
  }
  return [
    pascalName,
    {
      type: 'string',
    },
  ];
}

/**
 * Convert from Internal to OpenAPI
 * @param {SchemaField} field
 * @return {OpenApiSchema} OpenApiSchema
 */
export function fieldToOpenApiSchemaDefinition(field: SchemaField): [string, OpenApiSchemaDefinition] {
  if (field.kind === SchemaFieldKind.TEXT || field.kind === SchemaFieldKind.TEXTAREA || field.kind === SchemaFieldKind.MARKDOWN) {
    return [
      field.name,
      {
        type: 'string',
        minLength: field.minLength,
        maxLength: field.maxLength,
        description: field.description,
      },
    ];
  }
  if (field.kind === SchemaFieldKind.NUMBER) {
    return [
      field.name,
      {
        type: 'number',
        minimum: field.minValue,
        maximum: field.maxValue,
        description: field.description,
      },
    ];
  }
  if (field.kind === SchemaFieldKind.COLOR) {
    return [
      field.name,
      {
        type: 'string',
        format: 'color',
        description: field.description,
      },
    ];
  }
  if (field.kind === SchemaFieldKind.DATE) {
    return [
      field.name,
      {
        type: 'string',
        format: 'date',
        description: field.description,
      },
    ];
  }
  if (field.kind === SchemaFieldKind.DATETIME) {
    return [
      field.name,
      {
        type: 'string',
        format: 'date-time',
        description: field.description,
      },
    ];
  }
  if (field.kind === SchemaFieldKind.BOOLEAN) {
    return [
      field.name,
      {
        type: 'boolean',
        description: field.description,
      },
    ];
  }
  if (field.kind === SchemaFieldKind.OPTION) {
    if (field.source === undefined || field.source === 'self') {
      return [
        field.name,
        {
          type: 'string',
          description: field.description,
          enum: field.options?.map(it => it.value),
        },
      ];
    } else {
      const name = field.source || 'unknown';
      const pascalName = name[0].toUpperCase() + name.slice(1);
      return [
        field.name,
        {
          description: field.description,
          $ref: `#/components/schemas/${pascalName}`,
        },
      ];
    }
  }
  if (field.kind === SchemaFieldKind.OPTIONS) {
    if (field.source === undefined || field.source === 'self') {
      return [
        field.name,
        {
          type: 'array',
          description: field.description,
          minItems: field.minValues,
          maxItems: field.maxValues,
          items: {
            type: 'string',
            enum: field.options?.map(it => it.value),
          },
        },
      ];
    } else {
      const name = field.source;
      const pascalName = name[0].toUpperCase() + name.slice(1);
      return [
        field.name,
        {
          type: 'array',
          description: field.description,
          minItems: field.minValues,
          maxItems: field.maxValues,
          items: {
            $ref: `#/components/schemas/${pascalName}`,
          },
        },
      ];
    }
  }
  if (field.kind === SchemaFieldKind.LINK) {
    return [
      field.name,
      {
        description: field.description,
        $ref: '#/components/schemas/ContentLink',
      },
    ];
  }
  if (field.kind === SchemaFieldKind.REFERENCE) {
    return [
      field.name,
      {
        description: field.description,
        $ref: '#/components/schemas/ContentReference',
      },
    ];
  }
  if (field.kind === SchemaFieldKind.REFERENCES) {
    return [
      field.name,
      {
        type: 'array',
        description: field.description,
        items: {
          $ref: '#/components/schemas/ContentReference',
        },
      },
    ];
  }
  if (field.kind === SchemaFieldKind.ASSET) {
    return [
      field.name,
      {
        description: field.description,
        $ref: '#/components/schemas/ContentAsset',
      },
    ];
  }
  if (field.kind === SchemaFieldKind.ASSETS) {
    return [
      field.name,
      {
        type: 'array',
        description: field.description,
        items: {
          $ref: '#/components/schemas/ContentAsset',
        },
      },
    ];
  }
  if (field.kind === SchemaFieldKind.SCHEMA) {
    return [
      field.name,
      {
        description: field.description,
        oneOf:
          field.schemas?.map(it => {
            const name = it;
            const pascalName = name[0].toUpperCase() + name.slice(1);
            return {
              $ref: `#/components/schemas/${pascalName}`,
            };
          }) || [],
        discriminator: {
          propertyName: 'schema',
        },
      },
    ];
  }
  if (field.kind === SchemaFieldKind.SCHEMAS) {
    return [
      field.name,
      {
        type: 'array',
        description: field.description,
        items: {
          oneOf:
            field.schemas?.map(it => {
              const name = it;
              const pascalName = name[0].toUpperCase() + name.slice(1);
              return {
                $ref: `#/components/schemas/${pascalName}`,
              };
            }) || [],
          discriminator: {
            propertyName: 'schema',
          },
        },
      },
    ];
  }
  return [
    'unknown',
    {
      type: 'string',
    },
  ];
}
