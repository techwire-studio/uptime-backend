export const plans = [
  {
    name: 'Free',
    plan_type: 'free',
    monthly_price: 0,
    annual_price: 0,
    features: {
      max_monitors: 50,
      monitoring_interval_seconds: 300,
      http_port_ping_monitor: true,
      keyword_monitor: true,
      location_specific_monitoring: false,
      slow_response_alerts: false,
      ssl_monitor: false,
      domain_expiry_monitor: false,
      integrations_count: 5,
      full_featured_status_pages: false,
      notify_seats: 0,
      login_seats: 0,
      integrations: {
        pagerduty: true,
        zapier: true,
        msteams: true,
        mattermost: true,
        webhook: true,
        telegram: false,
        slack: false,
        pushover: true,
        pushbullet: true,
        discord: true,
        googlechat: true
      }
    },
    addons: []
  },
  {
    name: 'Solo',
    plan_type: 'solo',
    monthly_price: 87,
    annual_price: 870,
    features: {
      max_monitors: 50,
      monitoring_interval_seconds: 60,
      http_port_ping_monitor: true,
      keyword_monitor: true,
      location_specific_monitoring: true,
      slow_response_alerts: true,
      ssl_monitor: true,
      domain_expiry_monitor: true,
      integrations_count: 9,
      full_featured_status_pages: false,
      notify_seats: 1,
      login_seats: 0,
      integrations: {
        pagerduty: true,
        zapier: true,
        msteams: true,
        mattermost: true,
        webhook: true,
        telegram: false,
        slack: false,
        pushover: true,
        pushbullet: true,
        discord: true,
        googlechat: true
      }
    },
    addons: [
      { name: 'Extra Monitor', type: 'quantity', price_per_unit: 10 },
      {
        name: 'Notify-only Seat',
        type: 'quantity',
        price_per_unit: 5,
        max_quantity: 1
      }
    ]
  },
  {
    name: 'Team',
    plan_type: 'team',
    monthly_price: 3429,
    annual_price: 34290,
    features: {
      max_monitors: 100,
      monitoring_interval_seconds: 60,
      http_port_ping_monitor: true,
      keyword_monitor: true,
      location_specific_monitoring: true,
      slow_response_alerts: true,
      ssl_monitor: true,
      domain_expiry_monitor: true,
      integrations_count: 12,
      full_featured_status_pages: true,
      notify_seats: 3,
      login_seats: 3,
      integrations: {
        pagerduty: true,
        zapier: true,
        msteams: true,
        mattermost: true,
        webhook: true,
        telegram: false,
        slack: false,
        pushover: true,
        pushbullet: true,
        discord: true,
        googlechat: true
      }
    },
    addons: [
      { name: 'Extra Monitor', type: 'quantity', price_per_unit: 15 },
      { name: 'Notify-only Seat', type: 'quantity', price_per_unit: 10 },
      { name: 'Login Seat', type: 'quantity', price_per_unit: 20 }
    ]
  },
  {
    name: 'Enterprise',
    plan_type: 'enterprise',
    monthly_price: 6454,
    annual_price: 64540,
    features: {
      max_monitors: 1000,
      monitoring_interval_seconds: 30,
      http_port_ping_monitor: true,
      keyword_monitor: true,
      location_specific_monitoring: true,
      slow_response_alerts: true,
      ssl_monitor: true,
      domain_expiry_monitor: true,
      integrations_count: 12,
      full_featured_status_pages: true,
      notify_seats: 5,
      login_seats: 5,
      integrations: {
        pagerduty: true,
        zapier: true,
        msteams: true,
        mattermost: true,
        webhook: true,
        telegram: false,
        slack: false,
        pushover: true,
        pushbullet: true,
        discord: true,
        googlechat: true
      }
    },
    addons: [
      { name: 'Extra Monitor', type: 'quantity', price_per_unit: 50 },
      { name: 'Notify-only Seat', type: 'quantity', price_per_unit: 30 },
      { name: 'Login Seat', type: 'quantity', price_per_unit: 50 }
    ]
  }
];
