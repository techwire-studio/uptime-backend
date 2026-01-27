import { env } from '@/configs/env';
import { catchAsync } from '@/middlewares/error';
import prisma from '@/prisma';
import { CreateClientType } from '@/types/workspace';
import {
  sendErrorResponse,
  sendSuccessResponse
} from '@/utils/responseHandler';
import { RequestHandler } from 'express';

async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
}> {
  const res = await fetch(`${env.BRICKPAY_API_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: env.BRICKYPAY_CLIENT_ID,
      client_secret: env.BRICKYPAY_CLIENT_SECRET
    })
  });

  const data = await res.json();

  if (!res.ok) throw new Error('Request failed');

  return data as { access_token: string };
}

export const getWorkspaceMaintenance: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;
    const userId = request.userId;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const maintenance = await prisma.maintenance.findUnique({
      where: { workspace_id: workspaceId }
    });

    if (!maintenance) {
      return sendSuccessResponse({
        response,
        message: 'No maintenance for this workspace',
        data: []
      });
    }

    if (!maintenance.project_ids || maintenance.project_ids.length === 0) {
      return sendSuccessResponse({
        response,
        message: 'No projects in maintenance for this workspace',
        data: []
      });
    }

    const member = await prisma.workspaces.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: { user_id: userId }
        }
      },
      select: {
        members: {
          where: { user_id: userId },
          select: { metadata: true }
        }
      }
    });

    const matchedMember = member?.members[0];

    const metadata = matchedMember?.metadata as Record<string, string>;

    const { access_token } = await exchangeCodeForToken(
      metadata.code as string
    );

    const projects = await Promise.all(
      maintenance.project_ids.map(async (projectId) => {
        try {
          const apiResponse = await fetch(
            `${env.BRICKPAY_API_URL}/projects/${projectId}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${access_token}`
              }
            }
          );

          if (!apiResponse.ok) return null;

          return apiResponse.json();
        } catch {
          return null;
        }
      })
    );

    const filteredProjects = projects.filter(Boolean);

    sendSuccessResponse({
      response,
      message: 'Fetched workspace maintenance projects successfully',
      data: filteredProjects
    });
  }
);

export const createClient: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;
    const userId = request.userId;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const member = await prisma.workspaces.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: { user_id: userId }
        }
      },
      select: {
        members: {
          where: { user_id: userId },
          select: { metadata: true }
        }
      }
    });

    const matchedMember = member?.members[0];

    const metadata = matchedMember?.metadata as Record<string, string>;

    const { access_token } = await exchangeCodeForToken(
      metadata.code as string
    );

    try {
      const result = await createClientService(
        workspaceId,
        request.body,
        access_token
      );

      if (result.isAdmin) {
        return sendSuccessResponse({
          response,
          message: 'Admin created successfully',
          data: result.data
        });
      }

      sendSuccessResponse({
        response,
        message: 'Client created successfully',
        data: result.data
      });
    } catch (error) {
      sendErrorResponse({
        response,
        message: 'Failed to connect to auth service'
      });
    }
  }
);

export const getWorkspaceMaintenanceClients: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;
    const userId = request.userId;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const maintenance = await prisma.maintenance.findUnique({
      where: { workspace_id: workspaceId }
    });

    if (!maintenance || !maintenance.client_ids?.length) {
      return sendSuccessResponse({
        response,
        message: 'No clients in maintenance for this workspace',
        data: {
          clients: [],
          paymentProviders: []
        }
      });
    }

    const member = await prisma.workspaces.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: { user_id: userId }
        }
      },
      select: {
        members: {
          where: { user_id: userId },
          select: { metadata: true }
        }
      }
    });

    const matchedMember = member?.members[0];
    const metadata = matchedMember?.metadata as Record<string, string>;

    const { access_token } = await exchangeCodeForToken(
      metadata.code as string
    );

    const [clientsResult, providersResult] = await Promise.all([
      Promise.all(
        maintenance.client_ids.map(async (clientId) => {
          try {
            const apiResponse = await fetch(
              `${env.BRICKPAY_API_URL}/clients/${clientId}`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'authorization': `Bearer ${access_token}`
                }
              }
            );

            if (!apiResponse.ok) return null;

            return apiResponse.json();
          } catch {
            return null;
          }
        })
      ),

      (async () => {
        try {
          const apiResponse = await fetch(`${env.BRICKPAY_API_URL}/providers`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'authorization': `Bearer ${access_token}`
            }
          });

          if (!apiResponse.ok) return null;

          return apiResponse.json();
        } catch {
          return null;
        }
      })()
    ]);

    const filteredClients = clientsResult.filter(Boolean);

    sendSuccessResponse({
      response,
      message:
        'Fetched workspace maintenance clients and payment providers successfully',
      data: {
        clients: filteredClients,
        paymentProviders: providersResult ?? []
      }
    });
  }
);

export const createMaintenance: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;
    const userId = request.userId;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const member = await prisma.workspaces.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: { user_id: userId }
        }
      },
      select: {
        members: {
          where: { user_id: userId },
          select: { metadata: true }
        }
      }
    });

    const matchedMember = member?.members[0];

    const metadata = matchedMember?.metadata as Record<string, string>;

    const { access_token } = await exchangeCodeForToken(
      metadata.code as string
    );

    try {
      const apiResponse = await fetch(`${env.BRICKPAY_API_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(request.body)
      });

      const data = (await apiResponse.json()) as Record<string, string>;

      if (!apiResponse.ok) {
        return sendErrorResponse({
          response,
          message: 'Failed to create project'
        });
      }

      const projectId = data?.id as string;

      const existing = await prisma.maintenance.findUnique({
        where: { workspace_id: workspaceId }
      });

      if (existing) {
        if (!existing.project_ids.includes(projectId)) {
          await prisma.maintenance.update({
            where: { workspace_id: workspaceId },
            data: { project_ids: { push: projectId } }
          });
        }
      } else {
        await prisma.maintenance.create({
          data: {
            workspace_id: workspaceId,
            project_ids: [projectId]
          }
        });
      }

      sendSuccessResponse({
        response,
        message: 'Maintenance created successfully',
        data
      });
    } catch (error) {
      sendErrorResponse({
        response,
        message: 'Failed to connect to service'
      });
    }
  }
);

export async function createClientService(
  workspaceId: string,
  payload: CreateClientType,
  accessToken: string
) {
  const apiResponse = await fetch(`${env.BRICKPAY_API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const data = (await apiResponse.json()) as Record<string, string>;

  if (!apiResponse.ok) {
    throw new Error('Failed to create client');
  }

  if (payload.role === 'ADMIN') {
    return { data, isAdmin: true };
  }

  const clientId = data?.id as string;

  const existing = await prisma.maintenance.findUnique({
    where: { workspace_id: workspaceId }
  });

  if (existing) {
    if (!existing.client_ids.includes(clientId)) {
      await prisma.maintenance.update({
        where: { workspace_id: workspaceId },
        data: { client_ids: { push: clientId } }
      });
    }
  } else {
    await prisma.maintenance.create({
      data: {
        workspace_id: workspaceId,
        client_ids: [clientId]
      }
    });
  }

  return { data, isAdmin: false };
}
