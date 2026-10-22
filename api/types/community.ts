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
};

export type CommunityComment = {
  id: string;
  name: string;
  text: string;
  time: string;
  userId?: string;
};
