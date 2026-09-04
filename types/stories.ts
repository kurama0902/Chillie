export type StoryMediaType = "image" | "video";

export type StoryMedia = {
  id: string;
  uri: string;
  type: StoryMediaType;
  created_at: string;
};

export type StoryUser = {
  id: string;
  name: string;
  avatar_url: string;
  stories: StoryMedia[];
};

export type StoriesResponse = {
  users: StoryUser[];
};
