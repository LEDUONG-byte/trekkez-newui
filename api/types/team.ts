export type Team = {
  id: string;
  ownerId: string;

  name: string;
  description: string;

  memberCount: number;

  maxMembers?: number;
  allowMatchmaking?: boolean;

  level: string;
  location: string;
  routeName: string;
  tripDate: string;

  meetingPoint: string;
  note: string;

  imageUrl: string;

  joined: boolean;
  mine: boolean;

  createdAt?: string;
  updatedAt?: string;
};

export type TeamMember = {
  teamId: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: string;

  displayName: string;
  avatarUrl: string;
};

export type TeamInput = {
  id: string;

  name: string;
  description: string;

  level: string;
  location: string;
  routeName: string;
  tripDate: string;

  meetingPoint: string;
  note: string;

  imageUrl?: string;
};
