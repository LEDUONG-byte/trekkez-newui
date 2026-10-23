/** TrekkEZ New UI scoped API; no frontend file is modified by this package. */
export * as auth from './services/auth/auth-session';
export * as account from './services/account/account-supabase';
export * as teams from './services/team/team-supabase';
export * as teamInvitations from './services/team/team-invitation';
export * as joinRequests from './services/team/team-join-request';
export * as plans from './services/plan/plan-team-supabase';
export * as planCatalog from './services/plan/plan-item-catalog';
export * as planTime from './services/plan/trip-time';
export * as directions from './services/plan/mapbox-directions';
export * as community from './services/community/community-supabase';
export * as posts from './services/community/community-post-actions';
export * as social from './services/community/social-supabase';
export * as notifications from './services/notifications/notifications-supabase';
export * as activityProfile from './services/activity/activity-profile';
export * as routes from './services/route/route-read';
export * as newUi from './integration/newui-gateway';
export * from './integration/newui-mappers';
