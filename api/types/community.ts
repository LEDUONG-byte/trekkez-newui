export type CommunityPost = {
  id: string;
  author: string;
  time: string;
  location: string;
  title: string;
  content: string;
  image: string;
  likes: number;
  comments: number;
  tag: "Kinh nghiệm" | "Cung đường" | "Ảnh đẹp";
  liked?: boolean;
  saved?: boolean;
  mine?: boolean;
  authorId?: string;
  /** False only when legacy author text disagrees with current authenticated profile. */
  authorIdentityVerified?: boolean;
};

export type CommunityComment = {
  id: string;
  name: string;
  text: string;
  time: string;
  userId?: string;
  avatarUrl?: string;
};
