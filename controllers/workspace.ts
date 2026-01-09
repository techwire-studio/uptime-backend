import { catchAsync } from '@/middlewares/error';
import prisma from '@/prisma';
import { sendInviteEmail } from '@/services/mailer';
import {
  CreateAlertChannelType,
  InviteWorkspaceMemberType,
  UpdateTagsType,
  UpdateWorkspaceMemberType,
  WorkspaceMembersRole
} from '@/types/workspace';
import {
  sendSuccessResponse,
  sendErrorResponse
} from '@/utils/responseHandler';
import { RequestHandler } from 'express';

export const createWorkspaceOrAddUser = async ({
  email,
  userId
}: {
  email: string;
  userId: string;
}) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error('User not found with this email');
  }

  const existingMember = await prisma.workspace_members.findFirst({
    where: { metadata: { path: ['email'], equals: email } }
  });

  if (existingMember && !existingMember.user_id) {
    await prisma.workspace_members.update({
      where: { id: existingMember.id },
      data: { user_id: userId }
    });

    const metadata = existingMember.metadata as {
      countryCode?: string;
      phoneNumber?: string;
    };

    await prisma.user_metadata.upsert({
      where: { user_id: userId },
      update: {
        sms_country_code: metadata?.countryCode || '',
        sms_phone_number: metadata?.phoneNumber || ''
      },
      create: {
        user_id: userId,
        sms_country_code: metadata?.countryCode || '',
        sms_phone_number: metadata?.phoneNumber || ''
      }
    });
  }

  const workspace = await prisma.workspaces.create({
    data: {
      name: user.name || 'My Workspace',
      owner_id: userId,
      current_plan_type: 'free',
      razorpay_customer_id: null
    }
  });

  const member = await prisma.workspace_members.create({
    data: {
      workspace_id: workspace.id,
      user_id: userId,
      role: WorkspaceMembersRole.OWNER,
      metadata: { email },
      is_active: true
    }
  });

  return {
    message: 'Workspace created and user added as owner',
    workspace,
    member
  };
};

/**
 * @route POST /workspaces/:workspaceId/integrations
 * @description Create an alert channel for a workspace
 */
export const createAlertChannels: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const { type, config, events } = request.body as CreateAlertChannelType;

    const channel = await prisma.alert_channels.create({
      data: {
        workspace_id: workspaceId,
        type,
        destination: JSON.stringify(config)
      }
    });

    await prisma.alert_rules.upsert({
      where: {
        workspace_id_alert_type: {
          workspace_id: workspaceId,
          alert_type: type
        }
      },
      update: {
        enabled: true,
        events: events
      },
      create: {
        workspace_id: workspaceId,
        alert_type: type,
        enabled: true,
        events: events
      }
    });

    sendSuccessResponse({
      response,
      data: channel,
      message: 'Alert channel created successfully'
    });
  }
);

/**
 * @route GET /workspaces/:workspaceId/integrations
 * @description Fetch all alert channels for a workspace
 */
export const getAlertChannels: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const channels = await prisma.alert_channels.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      message: 'Fetched alert channels successfully',
      data: channels
    });
  }
);

/**
 * @route GET /workspaces/:workspaceId/alert-rules
 * @description Fetch all alert rules for a workspace
 */
export const getAlertRules: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const rules = await prisma.alert_rules.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' }
    });

    sendSuccessResponse({
      response,
      message: 'Fetched alert rules successfully',
      data: rules
    });
  }
);

/**
 * @route PATCH /alert-rules/:ruleId
 * @description Update an alert rule by its Id
 */
export const updateAlertRule: RequestHandler = catchAsync(
  async (request, response) => {
    const { ruleId } = request.params;

    if (!ruleId) {
      return sendErrorResponse({
        response,
        message: 'Rule Id is required'
      });
    }

    const { events, enabled } = request.body as {
      events?: string[];
      enabled?: boolean;
    };

    const updatedRule = await prisma.alert_rules.update({
      where: { id: ruleId },
      data: {
        ...(events && { events }),
        ...(typeof enabled === 'boolean' && { enabled })
      }
    });

    sendSuccessResponse({
      response,
      message: 'Alert rule updated successfully',
      data: updatedRule
    });
  }
);

/**
 * @route GET /users/:userId/workspaces
 * @description Fetch all workspaces where the user is a member or owner
 */
export const getUserWorkspaces: RequestHandler = catchAsync(
  async (request, response) => {
    const { userId } = request.params;

    if (!userId) {
      return sendErrorResponse({
        response,
        message: 'User Id is required'
      });
    }

    const workspaces = await getWorkspaceByUserId(userId);

    sendSuccessResponse({
      response,
      message: 'Fetched user workspaces successfully',
      data: workspaces
    });
  }
);

export const getWorkspaceMembers: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const members = await prisma.workspace_members.findMany({
      where: { workspace_id: workspaceId },
      select: {
        id: true,
        role: true,
        is_active: true,
        metadata: true,
        user: {
          select: {
            id: true,
            userMetadata: {
              select: {
                sms_country_code: true,
                sms_phone_number: true
              }
            },
            email: true,
            name: true
          }
        }
      }
    });

    sendSuccessResponse({
      response,
      message: 'Fetched workspace members successfully',
      data: members
    });
  }
);

export const getWorkspaceByUserId = async (userId: string) => {
  return prisma.workspaces.findMany({
    where: {
      OR: [{ owner_id: userId }, { members: { some: { user_id: userId } } }]
    },
    select: {
      id: true,
      name: true,
      members: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userMetadata: {
                select: {
                  call_country_code: true,
                  call_phone_number: true
                }
              }
            }
          },
          role: true
        }
      },
      billing_details: true,
      subscription: {
        where: { status: 'active' },
        include: {
          plan: true,
          transactions: true
        }
      }
    }
  });
};

export const deleteUserAndRelatedData = (userId: string) => {
  return prisma.$transaction(async (tx) => {
    const ownedWorkspaces = await tx.workspaces.findMany({
      where: { owner_id: userId },
      select: { id: true }
    });

    const workspaceIds = ownedWorkspaces.map((w) => w.id);

    if (workspaceIds.length > 0) {
      await tx.alerts_sent.deleteMany({
        where: { incident: { workspace_id: { in: workspaceIds } } }
      });

      await tx.incidents.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.monitor_checks.deleteMany({
        where: { monitor: { workspace_id: { in: workspaceIds } } }
      });

      await tx.monitors.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.alert_rules.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.alert_channels.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.status_pages.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.workspace_members.deleteMany({
        where: { workspace_id: { in: workspaceIds } }
      });

      await tx.workspaces.deleteMany({
        where: { id: { in: workspaceIds } }
      });
    }

    await tx.workspace_members.deleteMany({
      where: { user_id: userId }
    });

    await tx.session.deleteMany({
      where: { userId }
    });

    await tx.account.deleteMany({
      where: { userId }
    });

    await tx.user_metadata.deleteMany({
      where: { user_id: userId }
    });

    await tx.user.delete({
      where: { id: userId }
    });
  });
};

export const getWorkspaceTags: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const tags = await prisma.tags.findMany({
      where: {
        workspace_id: workspaceId
      },
      select: {
        id: true,
        name: true,
        monitors: {
          select: {
            monitor: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    const formatted = tags.map((tag) => ({
      ...tag,
      monitors: tag.monitors.map((m) => m.monitor.id)
    }));

    sendSuccessResponse({
      response,
      message: 'Fetched workspace tags successfully',
      data: formatted
    });
  }
);

export const updateWorkspaceTags: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;
    const {
      monitorId,
      addedTags = [],
      removedTags = []
    } = request.body as UpdateTagsType;

    if (!workspaceId || !monitorId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id and Monitor Id are required'
      });
    }

    await prisma.$transaction(async (tx) => {
      if (addedTags.length > 0) {
        await tx.monitor_tags.createMany({
          data: addedTags.map((tagId: string) => ({
            tag_id: tagId,
            monitor_id: monitorId
          })),
          skipDuplicates: true
        });
      }

      if (removedTags.length > 0) {
        await tx.monitor_tags.deleteMany({
          where: {
            monitor_id: monitorId,
            tag_id: {
              in: removedTags
            }
          }
        });
      }
    });

    sendSuccessResponse({
      response,
      data: null,
      message: 'Tags updated successfully'
    });
  }
);

/**
 * @route POST /workspaces/:workspaceId/invite
 * @description Invite a team member or add notify-only alert recipient
 */
export const inviteTeamMember: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;
    const payload = request.body as InviteWorkspaceMemberType;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const workspace = await prisma.workspaces.findUnique({
      where: { id: workspaceId },
      select: { name: true, owner: { select: { name: true } } }
    });

    if (!workspace) {
      return sendErrorResponse({
        response,
        message: 'Workspace not found'
      });
    }

    // Check if user exists in the system
    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    // If user exists, check if they're already a workspace member
    if (user) {
      const existingMember = await prisma.workspace_members.findFirst({
        where: {
          workspace_id: workspaceId,
          user_id: user.id
        }
      });

      if (existingMember) {
        return sendErrorResponse({
          response,
          message: 'User is already a member of this workspace'
        });
      }
    }

    if (payload.role === WorkspaceMembersRole.NOTIFY_ONLY) {
      const existingChannel = await prisma.alert_channels.findFirst({
        where: {
          workspace_id: workspaceId,
          type: 'email',
          destination: JSON.stringify({ email: payload.email })
        }
      });

      if (existingChannel) {
        return sendErrorResponse({
          response,
          message: 'Notify-only email already exists in alert channel'
        });
      }

      const channel = await prisma.alert_channels.create({
        data: {
          workspace_id: workspaceId,
          type: 'email',
          destination: JSON.stringify({ email: payload.email })
        }
      });

      await prisma.workspace_members.create({
        data: {
          workspace_id: workspaceId,
          metadata: payload,
          user_id: user?.id || null,
          role: payload.role,
          is_active: true
        }
      });

      // await sendInviteEmail(
      //   email,
      //   workspace.owner?.name || workspace.name,
      //   role
      // );

      return sendSuccessResponse({
        response,
        message:
          'Notify-only member added to workspace & alert channel, email sent',
        data: channel
      });
    }

    const member = await prisma.workspace_members.create({
      data: {
        workspace_id: workspaceId,
        metadata: payload,
        user_id: user?.id || null,
        role: payload.role,
        is_active: false
      }
    });

    // await sendInviteEmail(email, workspace.owner?.name || workspace.name, role);

    return sendSuccessResponse({
      response,
      message: 'Workspace member added and invitation email sent',
      data: member
    });
  }
);

/**
 * @route PATCH /workspaces/:workspaceId/members
 * @description Update workspace member role and metadata
 */
export const updateWorkspaceMember: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId } = request.params;

    const payload = request.body as UpdateWorkspaceMemberType;

    const userId = request.userId;

    if (!workspaceId) {
      return sendErrorResponse({
        response,
        message: 'Workspace Id is required'
      });
    }

    const requester = await prisma.workspace_members.findFirst({
      where: {
        workspace_id: workspaceId,
        user_id: userId
      }
    });

    if (!requester || requester.role !== WorkspaceMembersRole.OWNER) {
      return sendErrorResponse({
        response,
        message: 'You are not allowed to update workspace members'
      });
    }

    const members = await prisma.$queryRaw<
      {
        id: string;
        metadata: any;
        role: string;
      }[]
    >`
  SELECT *
  FROM workspace_members
  WHERE workspace_id = ${workspaceId}
    AND metadata->>'email' = ${payload.email}
  LIMIT 1
`;

    if (!members || members.length === 0) {
      return sendErrorResponse({
        response,
        message: 'Workspace member not found'
      });
    }

    const member = members[0];

    if (!member) {
      return sendErrorResponse({
        response,
        message: 'Workspace member not found'
      });
    }

    if (
      payload.role === WorkspaceMembersRole.NOTIFY_ONLY &&
      member.role !== WorkspaceMembersRole.NOTIFY_ONLY
    ) {
      const existingChannel = await prisma.alert_channels.findFirst({
        where: {
          workspace_id: workspaceId,
          type: 'email',
          destination: JSON.stringify({ email: payload.email })
        }
      });

      if (!existingChannel) {
        await prisma.alert_channels.create({
          data: {
            workspace_id: workspaceId,
            type: 'email',
            destination: JSON.stringify({ email: payload.email })
          }
        });
      }
    }

    const updatedMember = await prisma.workspace_members.update({
      where: { id: member.id },
      data: {
        role: payload.role ?? member.role,
        metadata: {
          ...(member.metadata ?? {}),
          ...(payload.email && { email: payload.email }),
          ...(payload.role && { role: payload.role }),
          ...(payload.countryCode && { countryCode: payload.countryCode }),
          ...(payload.phoneNumber && { phoneNumber: payload.phoneNumber })
        }
      }
    });

    sendSuccessResponse({
      response,
      message: 'Workspace member updated successfully',
      data: updatedMember
    });
  }
);

/**
 * @route DELETE /workspaces/:workspaceId/members/:memberId
 * @description Delete a workspace member
 */
export const deleteWorkspaceMember: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId, memberId } = request.params;
    const userId = request.userId;

    if (!workspaceId || !memberId)
      return sendErrorResponse({
        response,
        message: 'Workspace Id and Member Id are required'
      });

    const member = await prisma.workspace_members.findFirst({
      where: {
        id: memberId,
        workspace_id: workspaceId
      }
    });

    if (!member)
      return sendErrorResponse({
        response,
        message: 'Workspace member not found'
      });

    const requester = await prisma.workspace_members.findFirst({
      where: {
        workspace_id: workspaceId,
        user_id: userId
      }
    });

    if (!requester || requester.role !== WorkspaceMembersRole.OWNER)
      return sendErrorResponse({
        response,
        message: 'You are not allowed to remove members from this workspace'
      });

    if (member.user_id === userId)
      return sendErrorResponse({
        response,
        message: 'You cannot remove yourself from the workspace'
      });

    await prisma.workspace_members.delete({
      where: { id: memberId }
    });

    sendSuccessResponse({
      response,
      data: null,
      message: 'Workspace member removed successfully'
    });
  }
);

/**
 * @route PUT /workspaces/:workspaceId/integrations/:channelId
 * @description Update an existing alert channel for a workspace
 */
export const updateAlertChannel: RequestHandler = catchAsync(
  async (request, response) => {
    const { workspaceId, channelId } = request.params;

    if (!workspaceId || !channelId) {
      return sendErrorResponse({
        response,
        message: 'Workspace ID and Channel ID are required'
      });
    }

    const { type, config, events } = request.body as CreateAlertChannelType;

    const updatedChannel = await prisma.alert_channels.update({
      where: { id: channelId },
      data: {
        type,
        destination: JSON.stringify(config)
      }
    });

    await prisma.alert_rules.upsert({
      where: {
        workspace_id_alert_type: {
          workspace_id: workspaceId,
          alert_type: type
        }
      },
      update: {
        enabled: true,
        events: events
      },
      create: {
        workspace_id: workspaceId,
        alert_type: type,
        enabled: true,
        events: events
      }
    });

    sendSuccessResponse({
      response,
      data: updatedChannel,
      message: 'Alert channel updated successfully'
    });
  }
);
