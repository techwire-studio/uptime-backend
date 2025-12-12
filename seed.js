console.log('Start seeding...');

// ----------------------------
// USERS
// ----------------------------
const user1 = await prisma.users.create({
  data: {
    email: 'alice@example.com',
    password_hash: 'hashedpassword1'
  }
});

const user2 = await prisma.users.create({
  data: {
    email: 'bob@example.com',
    password_hash: 'hashedpassword2'
  }
});

// ----------------------------
// WORKSPACES
// ----------------------------
const workspace1 = await prisma.workspaces.create({
  data: {
    name: 'Workspace Alpha',
    owner_id: user1.id
  }
});

const workspace2 = await prisma.workspaces.create({
  data: {
    name: 'Workspace Beta',
    owner_id: user2.id
  }
});

// ----------------------------
// WORKSPACE MEMBERS
// ----------------------------
await prisma.workspace_members.createMany({
  data: [
    { workspace_id: workspace1.id, user_id: user1.id, role: 'owner' },
    { workspace_id: workspace1.id, user_id: user2.id, role: 'member' },
    { workspace_id: workspace2.id, user_id: user2.id, role: 'owner' }
  ]
});

// ----------------------------
// MONITORS
// ----------------------------
const monitor1 = await prisma.monitors.create({
  data: {
    workspace_id: workspace1.id,
    name: 'Website Health',
    url: 'https://example.com',
    type: 'http',
    interval_seconds: 60,
    timeout_ms: 5000,
    expected_status: 200,
    check_regions: 'us-east-1,eu-west-1',
    status: 'healthy',
    last_response_time_ms: 123,
    last_checked_at: '2025-01-12T10:30:00.000Z',
    next_run_at: '2025-01-12T10:31:00.000Z',
    consecutive_failures: 0,
    max_retries: 3
  }
});

const monitor2 = await prisma.monitors.create({
  data: {
    workspace_id: workspace2.id,
    name: 'API Health',
    url: 'https://api.example.com',
    type: 'http',
    interval_seconds: 60,
    timeout_ms: 5000,
    expected_status: 200,
    check_regions: 'us-east-1,eu-west-1',
    status: 'healthy',
    last_response_time_ms: 123,
    last_checked_at: '2025-01-12T10:30:00.000Z',
    next_run_at: '2025-01-12T10:31:00.000Z',
    consecutive_failures: 0,
    max_retries: 3
  }
});

// ----------------------------
// MONITOR CHECKS
// ----------------------------
await prisma.monitor_checks.createMany({
  data: [
    {
      monitor_id: monitor1.id,
      checked_at: new Date(),
      status: 'healthy',
      success: true,
      response_time_ms: 120,
      http_status: 200
    },
    {
      monitor_id: monitor2.id,
      checked_at: new Date(),
      status: 'unhealthy',
      success: false,
      error_message: 'Timeout'
    }
  ]
});

// ----------------------------
// INCIDENTS
// ----------------------------
const incident1 = await prisma.incidents.create({
  data: {
    monitor_id: monitor2.id,
    started_at: new Date(),
    reason: 'API not responding'
  }
});

// ----------------------------
// ALERT RULES
// ----------------------------
await prisma.alert_rules.createMany({
  data: [
    {
      monitor_id: monitor1.id,
      alert_type: 'email',
      enabled: true,
      notify_after_failures: 2
    },
    {
      monitor_id: monitor2.id,
      alert_type: 'slack',
      enabled: true,
      notify_after_failures: 1
    }
  ]
});

// ----------------------------
// ALERT CHANNELS
// ----------------------------

const channel2 = await prisma.alert_channels.create({
  data: {
    workspace_id: workspace2.id,
    type: 'slack',
    destination: '#alerts'
  }
});

// ----------------------------
// ALERTS SENT
// ----------------------------
await prisma.alerts_sent.createMany({
  data: [
    {
      monitor_id: monitor2.id,
      channel_id: channel2.id,
      incident_id: incident1.id,
      sent_at: new Date(),
      alert_type: 'slack',
      message: 'API is down!'
    }
  ]
});

console.log('Seeding finished.');
