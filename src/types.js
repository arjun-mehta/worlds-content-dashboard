// Data models

export const World = {
  id: String,
  name: String, // Book name
  author: String,
  elevenLabsVoiceId: String,
  heyGenAvatarId: String,
  heyGenImageKey: String, // Image key from HeyGen Upload Asset API for Avatar IV videos
  systemPrompt: String,
  createdAt: String,
  updatedAt: String,
};

export const Video = {
  id: String,
  worldId: String,
  chapterTitle: String,
  chapterNumber: Number,
  script: String,
  audioUrl: String,
  heyGenVideoId: String,
  heyGenStatus: String, // 'pending' | 'processing' | 'completed' | 'failed'
  avatarId: String,
  videoUrl: String,
  createdAt: String,
  updatedAt: String,
};

