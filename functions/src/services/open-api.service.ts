import { Schema, SchemaField, SchemaFieldKind, SchemaType } from '../models';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { ReferenceObject, SchemaObject } from 'openapi3-ts/dist/model/openapi30';

/**
 * Generate Open API
 * @param {Map<string, Schema>} schemasById
 * @return {OpenAPIObject} OpenApiSchema
 */
export function generateOpenApi(schemasById: Map<string, Schema>): OpenAPIObject {
  const schemasDefinition: Record<string, SchemaObject | ReferenceObject> = {
    Translations: {
      description: 'Key-Value Object. Where Key is Translation ID and Value is Translated Content',
      type: 'object',
      additionalProperties: {
        type: 'string',
        description: 'Translation Content',
        example: 'Email',
      },
      example: {
        'login.form.email': 'Email',
        'login.form.password': 'Password',
        'login.form.login': 'Login',
        'login.form.cancel': 'Cancel',
      },
    },
    ContentAsset: {
      type: 'object',
      description: 'Content Asset define reference to a Asset.',
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
      example: {
        kind: 'ASSET',
        uri: 'WLWc4vOACzG1QjK9AEo9',
      },
    },
    ContentLink: {
      type: 'object',
      description: 'Content Link define reference to a Link.',
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
      example: {
        kind: 'LINK',
        type: 'content',
        target: '_self',
        uri: 'WLWc4vOACzG1QjK9AEo9',
      },
    },
    ContentReference: {
      type: 'object',
      description: 'Content Reference define reference to a Content.',
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
      example: {
        kind: 'REFERENCE',
        uri: 'WLWc4vOACzG1QjK9AEo9',
      },
    },
    ContentRichText: {
      type: 'object',
      description: 'Content RichText define content as JSON Object.',
      properties: {
        type: {
          type: 'string',
          description: 'Define the type of Content Node',
        },
        content: {
          type: 'array',
          description: 'List of Content Nodes',
          items: {
            $ref: '#/components/schemas/ContentRichText',
          },
        },
      },
      example: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Wow, this editor instance exports its content as JSON.',
              },
            ],
          },
        ],
      },
    },
    Content: {
      allOf: [
        { $ref: '#/components/schemas/ContentMetadata' },
        {
          type: 'object',
          description: 'Content define shared object for all possible Content Types.',
          properties: {
            data: {
              $ref: '#/components/schemas/ContentData',
            },
          },
        },
      ],
      example: {
        id: 'WLWc4vOACzG1QjK9AEo9',
        kind: 'DOCUMENT',
        name: 'Privacy Policy',
        locale: 'en',
        slug: 'privacy-policy',
        parentSlug: 'legal',
        fullSlug: 'legal/privacy-policy',
        createdAt: '2023-08-23T21:08:17.551Z',
        updatedAt: '2024-01-23T14:10:37.852Z',
        publishedAt: '2023-08-23T21:09:15.191Z',
        data: {
          _id: 'a8ca3ed3-6613-4fb6-ae4e-5b846eb5775c',
          schema: 'docArticle',
        },
      },
    },
    ContentMetadata: {
      type: 'object',
      description: 'Content Metadata define short information about a Content for navigation reason.',
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
      example: {
        id: 'WLWc4vOACzG1QjK9AEo9',
        kind: 'DOCUMENT',
        name: 'Privacy Policy',
        slug: 'privacy-policy',
        parentSlug: 'legal',
        fullSlug: 'legal/privacy-policy',
        createdAt: '2023-08-23T21:08:17.551Z',
        updatedAt: '2024-01-23T14:10:37.852Z',
        publishedAt: '2023-08-23T21:09:15.191Z',
      },
    },
    Links: {
      description: 'Key-Value Object. Where Key is Unique identifier for the Content object and Value is Content Metadata.',
      type: 'object',
      additionalProperties: {
        $ref: '#/components/schemas/ContentMetadata',
      },
      example: {
        '4pLYWyN47c076mSfpWIy': {
          id: '4pLYWyN47c076mSfpWIy',
          kind: 'DOCUMENT',
          name: 'Options',
          slug: 'options',
          fullSlug: 'docs/schemas/options',
          parentSlug: 'docs/schemas',
          createdAt: '2024-05-01T09:56:00.923Z',
          updatedAt: '2024-05-01T09:57:06.445Z',
          publishedAt: '2024-05-01T13:03:31.672Z',
        },
        '5L2ELYsmaM6C0fOBzKp0': {
          id: '5L2ELYsmaM6C0fOBzKp0',
          kind: 'DOCUMENT',
          name: 'Translations',
          slug: 'translations',
          fullSlug: 'docs/api/translations',
          parentSlug: 'docs/api',
          createdAt: '2024-05-04T14:03:54.100Z',
          updatedAt: '2024-05-07T14:03:57.457Z',
          publishedAt: '2024-05-07T11:05:46.094Z',
        },
        '7fUavXjDpFuHGdWgTFXy': {
          id: '7fUavXjDpFuHGdWgTFXy',
          kind: 'DOCUMENT',
          name: 'Overview',
          slug: 'overview',
          fullSlug: 'docs/content/overview',
          parentSlug: 'docs/content',
          createdAt: '2024-04-30T20:57:41.827Z',
          updatedAt: '2024-04-30T21:31:47.344Z',
          publishedAt: '2024-05-01T13:02:41.814Z',
        },
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
    description: 'ContentData defined Object to connect all possible root Schemas.',
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

  const openApi: OpenAPIObject = {
    openapi: '3.0.3',
    info: {
      title: 'Localess Open API Specification',
      version: '2.4.1',
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
          summary: 'Retrieve all Translations by Locale',
          description:
            'The endpoint allows you to retrieve all translations by locale. ' +
            'In case Locale is not present in the Localess, it will return the default locale translations. ' +
            'In case cache version is not present, it will redirect to the latest version.',
          operationId: 'getTranslationsByLocale',
          parameters: [
            {
              name: 'spaceId',
              in: 'path',
              description: 'Unique identifier for the Space object.',
              required: true,
              schema: {
                type: 'string',
                example: 'UdV5ygPZuOD1JMO9Qat9',
              },
            },
            {
              name: 'locale',
              in: 'path',
              description: 'Locale unique identifier (ISO 639-1).',
              required: true,
              schema: {
                type: 'string',
                example: 'en',
              },
            },
            {
              name: 'cv',
              in: 'query',
              description: 'Cache version.',
              required: false,
              schema: {
                type: 'string',
                example: '1706217382028',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Return the Translations Object if the request succeeded.',
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
          summary: 'Retrieve Links to all Contents',
          description:
            'The endpoint allows you to retrieve all Content summery metadata mainly used to recreate content tree. ' +
            'In case cache version is not present, it will redirect to the latest version.',
          operationId: 'getContentLinks',
          parameters: [
            {
              name: 'spaceId',
              in: 'path',
              description: 'Unique identifier for the Space object.',
              required: true,
              schema: {
                type: 'string',
                example: 'UdV5ygPZuOD1JMO9Qat9',
              },
            },
            {
              name: 'kind',
              in: 'query',
              description: 'Content Kind. FOLDER or DOCUMENT. If not provided, it will return all.',
              required: false,
              schema: {
                type: 'string',
                enum: ['FOLDER', 'DOCUMENT'],
                example: 'DOCUMENT',
              },
            },
            {
              name: 'parentSlug',
              in: 'query',
              description: 'Content parent slug.',
              required: false,
              schema: {
                type: 'string',
                example: 'legal/policy',
              },
            },
            {
              name: 'excludeChildren',
              in: 'query',
              description: 'If **true**, exclude all sub slugs, otherwise include all content under current selected **parent slug**.',
              required: false,
              schema: {
                type: 'boolean',
                example: true,
                default: false,
              },
            },
            {
              name: 'cv',
              in: 'query',
              description: 'Cache version.',
              required: false,
              schema: {
                type: 'string',
                example: '1706217382028',
              },
            },
            {
              name: 'token',
              in: 'query',
              description: 'Authentication Token.',
              required: true,
              schema: {
                type: 'string',
                example: 'fb6oTcVjbnyLCMhO2iLY',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Return the Links Object if the request succeeded.',
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
          summary: 'Retrieve Content by Slug',
          description:
            'The endpoint allows you to retrieve a specific Content by the content full slug. ' +
            'In case cache version is not present, it will redirect to the latest version.',
          operationId: 'getContentBySlug',
          parameters: [
            {
              name: 'spaceId',
              in: 'path',
              description: 'Unique identifier for the Space object.',
              required: true,
              schema: {
                type: 'string',
                example: 'UdV5ygPZuOD1JMO9Qat9',
              },
            },
            {
              name: 'contentSlug',
              in: 'path',
              description: 'Content full slug.',
              required: true,
              schema: {
                type: 'string',
                example: 'legal/policy',
              },
            },
            {
              name: 'cv',
              in: 'query',
              description: 'Cache version.',
              required: false,
              schema: {
                type: 'string',
                example: '1706217382028',
              },
            },
            {
              name: 'locale',
              in: 'query',
              description: 'Locale unique identifier (ISO 639-1).',
              required: false,
              schema: {
                type: 'string',
                example: 'en',
              },
            },
            {
              name: 'version',
              in: 'query',
              description: 'Content version.',
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
              description: 'Authentication Token.',
              required: true,
              schema: {
                type: 'string',
                example: 'fb6oTcVjbnyLCMhO2iLY',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Return the Content Object if the request succeeded.',
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
          summary: 'Retrieve Content By ID',
          description:
            'The endpoint allows you to retrieve a specific Content by Unique identifier for the Content object. ' +
            'In case cache version is not present, it will redirect to the latest version.',
          operationId: 'getContentById',
          parameters: [
            {
              name: 'spaceId',
              in: 'path',
              description: 'Unique identifier for the Space object.',
              required: true,
              schema: {
                type: 'string',
                example: 'UdV5ygPZuOD1JMO9Qat9',
              },
            },
            {
              name: 'contentId',
              in: 'path',
              description: 'Unique identifier for the Content object.',
              required: true,
              schema: {
                type: 'string',
                example: '4ykrlCKwI7OCawK2T68g',
              },
            },
            {
              name: 'cv',
              in: 'query',
              description: 'Cache version.',
              required: false,
              schema: {
                type: 'string',
                example: '1706217382028',
              },
            },
            {
              name: 'locale',
              in: 'query',
              description: 'Locale unique identifier (ISO 639-1).',
              required: false,
              schema: {
                type: 'string',
                example: 'en',
              },
            },
            {
              name: 'version',
              in: 'query',
              description: 'Content version.',
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
              description: 'Authentication Token.',
              required: true,
              schema: {
                type: 'string',
                example: 'fb6oTcVjbnyLCMhO2iLY',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Return the Content Object if the request succeeded.',
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
          summary: 'Retrieve Asset By ID',
          description: 'The endpoint allows you to retrieve a specific Asset by Unique identifier for the Asset object.',
          operationId: 'getAssetById',
          parameters: [
            {
              name: 'spaceId',
              in: 'path',
              description: 'Unique identifier for the Space object.',
              required: true,
              schema: {
                type: 'string',
                example: 'UdV5ygPZuOD1JMO9Qat9',
              },
            },
            {
              name: 'assetId',
              in: 'path',
              description: 'Unique identifier for the Asset object.',
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
              description: 'In case you wish to download the asset.',
              required: false,
              schema: {
                type: 'boolean',
                example: false,
              },
            },
            {
              name: 'thumbnail',
              in: 'query',
              description: 'In case you have a video or animated image like WebP/Gif, and you wish to generate thumbnail.',
              required: false,
              schema: {
                type: 'boolean',
                example: false,
              },
            },
          ],
          responses: {
            '200': {
              description: 'Returns Asset file.',
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
export function schemaToOpenApiSchemaDefinition(id: string, schema: Schema): [string, SchemaObject | ReferenceObject] {
  const pascalName = id[0].toUpperCase() + id.slice(1);
  if (schema.type === SchemaType.ENUM) {
    return [
      pascalName,
      {
        type: 'string',
        enum: schema.values?.map(it => it.value),
        description: schema.description,
      },
    ];
  }
  if (schema.type === SchemaType.NODE || schema.type === SchemaType.ROOT) {
    const required = ['_id', 'schema'];
    schema.fields?.filter(it => it.required === true).forEach(it => required.push(it.name));
    const schemasDefinition: Record<string, SchemaObject | ReferenceObject> = {
      _id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique identifier of a component in a content.',
        example: 'a8ca3ed3-6613-4fb6-ae4e-5b846eb5775c',
      },
      schema: {
        type: 'string',
        enum: [id],
        description: 'Unique identifier for the Schema object.',
      },
    };
    for (const item of schema.fields?.sort((a, b) => a.name.localeCompare(b.name)) || []) {
      const [name, schema] = fieldToOpenApiSchemaDefinition(item);
      schemasDefinition[name] = schema;
    }
    return [
      pascalName,
      {
        type: 'object',
        description: schema.description,
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
export function fieldToOpenApiSchemaDefinition(field: SchemaField): [string, SchemaObject | ReferenceObject] {
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
  if (field.kind === SchemaFieldKind.RICH_TEXT) {
    return [
      field.name,
      {
        description: field.description,
        $ref: '#/components/schemas/ContentRichText',
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
