/**
 * OpenAPI 3.0 Specification Endpoint
 * Documents all API endpoints with authentication requirements
 */

export async function onRequestGet({ request }) {
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`

  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'Mitobyte Voting & Events API',
      description: `
# Mitobyte Platform API

This API provides access to the Mitobyte community platform features including events, RSVPs, check-ins, user profiles, and more.

## Authentication

All API endpoints require an API key for authentication. Include your API key in the request header:

\`\`\`
X-API-Key: your_api_key_here
\`\`\`

Or as a Bearer token:

\`\`\`
Authorization: Bearer your_api_key_here
\`\`\`

## Rate Limits

- Default: 1000 requests per hour per API key
- Custom rate limits can be configured by administrators

## Base URL

\`${baseUrl}/api\`
      `,
      version: '1.0.0',
      contact: {
        name: 'Mitobyte Team',
        url: baseUrl
      }
    },
    servers: [
      {
        url: `${baseUrl}/api`,
        description: 'Production API Server'
      }
    ],
    security: [
      {
        ApiKeyAuth: []
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication. Obtain from admin dashboard.'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date' },
            time: { type: 'string' },
            location: { type: 'string' },
            event_type: { type: 'string', enum: ['code_and_coffee', 'code_and_brews', 'hackathon', 'workshop', 'meetup'] },
            max_attendees: { type: 'integer', nullable: true },
            created_by: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            display_name: { type: 'string' },
            is_admin: { type: 'integer' },
            is_host: { type: 'integer' },
            is_sponsor: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        RSVP: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            event_id: { type: 'integer' },
            user_wallet_hash: { type: 'string' },
            rsvp_status: { type: 'string', enum: ['going', 'maybe', 'no'] },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    paths: {
      '/health': {
        get: {
          summary: 'Health Check',
          description: 'Check API health status',
          security: [],
          responses: {
            '200': {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/events': {
        get: {
          summary: 'List All Events',
          description: 'Retrieve a list of all events',
          tags: ['Events'],
          responses: {
            '200': {
              description: 'List of events',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      events: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Event' }
                      }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Unauthorized - Invalid or missing API key',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create Event',
          description: 'Create a new event (Admin/Host only)',
          tags: ['Events'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'description', 'date', 'time', 'location'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    date: { type: 'string', format: 'date' },
                    time: { type: 'string' },
                    location: { type: 'string' },
                    event_type: { type: 'string' },
                    max_attendees: { type: 'integer' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Event created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      eventId: { type: 'integer' }
                    }
                  }
                }
              }
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' }
          }
        }
      },
      '/events/{id}': {
        get: {
          summary: 'Get Event Details',
          description: 'Retrieve details of a specific event',
          tags: ['Events'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              description: 'Event ID'
            }
          ],
          responses: {
            '200': {
              description: 'Event details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      event: { $ref: '#/components/schemas/Event' }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Event not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/rsvps': {
        post: {
          summary: 'Create or Update RSVP',
          description: 'RSVP to an event',
          tags: ['RSVPs'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['eventId', 'walletAddress', 'rsvpStatus'],
                  properties: {
                    eventId: { type: 'integer' },
                    walletAddress: { type: 'string' },
                    rsvpStatus: { type: 'string', enum: ['going', 'maybe', 'no'] }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'RSVP updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/users': {
        get: {
          summary: 'List All Users',
          description: 'Retrieve a list of all users (Admin only)',
          tags: ['Users'],
          parameters: [
            {
              name: 'adminEmail',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'email' },
              description: 'Admin email for authorization'
            }
          ],
          responses: {
            '200': {
              description: 'List of users',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      users: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/User' }
                      },
                      stats: { type: 'object' }
                    }
                  }
                }
              }
            },
            '403': {
              description: 'Forbidden - Admin access required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/profile': {
        get: {
          summary: 'Get User Profile',
          description: 'Retrieve user profile information',
          tags: ['Users'],
          parameters: [
            {
              name: 'walletAddress',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'User wallet address'
            }
          ],
          responses: {
            '200': {
              description: 'User profile',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      profile: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Update User Profile',
          description: 'Update user profile information',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    walletAddress: { type: 'string' },
                    displayName: { type: 'string' },
                    tagline: { type: 'string' },
                    bio: { type: 'string' },
                    avatarUrl: { type: 'string', format: 'uri' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Profile updated successfully'
            }
          }
        }
      },
      '/checkin': {
        post: {
          summary: 'Check In to Event',
          description: 'Check in to an event',
          tags: ['Check-ins'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['eventId', 'walletAddress'],
                  properties: {
                    eventId: { type: 'integer' },
                    walletAddress: { type: 'string' },
                    responses: { type: 'object', description: 'Form responses' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Check-in successful'
            }
          }
        }
      },
      '/announcements': {
        get: {
          summary: 'Get Announcements',
          description: 'Retrieve platform announcements',
          tags: ['Announcements'],
          parameters: [
            {
              name: 'walletAddress',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by user wallet address'
            }
          ],
          responses: {
            '200': {
              description: 'List of announcements'
            }
          }
        }
      },
      '/bug-reports': {
        post: {
          summary: 'Submit Bug Report',
          description: 'Submit a bug report',
          tags: ['Bug Reports'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'description', 'reportedBy'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    reportedBy: { type: 'string' },
                    severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Bug report submitted successfully'
            }
          }
        }
      },
      '/event-requests': {
        get: {
          summary: 'Get Event Requests',
          description: 'Retrieve event requests (Admin only)',
          tags: ['Event Requests'],
          parameters: [
            {
              name: 'adminEmail',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'email' }
            },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['pending', 'approved', 'rejected'], default: 'pending' }
            }
          ],
          responses: {
            '200': {
              description: 'List of event requests'
            }
          }
        },
        post: {
          summary: 'Submit or Manage Event Request',
          description: 'Submit a new event request or manage existing requests (approve/reject)',
          tags: ['Event Requests'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'object',
                      description: 'Submit new event request',
                      required: ['action', 'title', 'description', 'date', 'time', 'walletAddress'],
                      properties: {
                        action: { type: 'string', enum: ['submit'] },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        date: { type: 'string', format: 'date' },
                        time: { type: 'string' },
                        location: { type: 'string' },
                        category: { type: 'string' },
                        walletAddress: { type: 'string' }
                      }
                    },
                    {
                      type: 'object',
                      description: 'Approve event request',
                      required: ['action', 'adminEmail', 'requestId'],
                      properties: {
                        action: { type: 'string', enum: ['approve'] },
                        adminEmail: { type: 'string' },
                        requestId: { type: 'integer' }
                      }
                    }
                  ]
                }
              }
            }
          },
          responses: {
            '200': { description: 'Request processed successfully' },
            '201': { description: 'Event request submitted successfully' }
          }
        }
      },
      '/admin/api-keys': {
        get: {
          summary: 'List API Keys',
          description: 'List all API keys (Admin only)',
          tags: ['API Keys'],
          parameters: [
            {
              name: 'adminEmail',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'email' }
            }
          ],
          responses: {
            '200': {
              description: 'List of API keys',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      keys: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer' },
                            key_name: { type: 'string' },
                            api_key: { type: 'string' },
                            created_by: { type: 'string' },
                            created_at: { type: 'string', format: 'date-time' },
                            last_used_at: { type: 'string', format: 'date-time', nullable: true },
                            expires_at: { type: 'string', format: 'date-time', nullable: true },
                            is_active: { type: 'integer' },
                            rate_limit: { type: 'integer' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Manage API Keys',
          description: 'Generate, activate, deactivate, or delete API keys (Admin only)',
          tags: ['API Keys'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'object',
                      description: 'Generate new API key',
                      required: ['action', 'adminEmail', 'keyName'],
                      properties: {
                        action: { type: 'string', enum: ['generate'] },
                        adminEmail: { type: 'string' },
                        keyName: { type: 'string' },
                        expiresInDays: { type: 'integer' },
                        rateLimit: { type: 'integer', default: 1000 },
                        notes: { type: 'string' }
                      }
                    },
                    {
                      type: 'object',
                      description: 'Deactivate API key',
                      required: ['action', 'adminEmail', 'keyId'],
                      properties: {
                        action: { type: 'string', enum: ['deactivate'] },
                        adminEmail: { type: 'string' },
                        keyId: { type: 'integer' }
                      }
                    }
                  ]
                }
              }
            }
          },
          responses: {
            '200': { description: 'Operation successful' },
            '201': {
              description: 'API key generated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      key: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          apiKey: { type: 'string', description: 'IMPORTANT: Save this key securely. It will not be shown again.' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Events', description: 'Event management operations' },
      { name: 'RSVPs', description: 'RSVP and attendance management' },
      { name: 'Users', description: 'User management and profiles' },
      { name: 'Check-ins', description: 'Event check-in operations' },
      { name: 'Announcements', description: 'Platform announcements' },
      { name: 'Bug Reports', description: 'Bug reporting system' },
      { name: 'Event Requests', description: 'User-submitted event requests' },
      { name: 'API Keys', description: 'API key management (Admin only)' }
    ]
  }

  return new Response(JSON.stringify(openApiSpec, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
