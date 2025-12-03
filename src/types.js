// Data models

export const World = {
  id: String,
  name: String, // Book name
  author: String,
  elevenLabsVoiceId: String,
  heyGenAvatarId: String,
  heyGenImageKey: String, // Deprecated: use heyGenImageKey1, heyGenImageKey2, heyGenImageKey3
  heyGenImageKey1: String, // Image key for angle 1
  heyGenImageKey2: String, // Image key for angle 2
  heyGenImageKey3: String, // Image key for angle 3
  systemPrompt: String,
  createdAt: String,
  updatedAt: String,
};

export const Video = {
  id: String,
  worldId: String,
  chapterTitle: String,
  chapterNumber: Number,
  angle: Number, // 1, 2, or 3 - which angle this video represents
  script: String,
  audioUrl: String,
  heyGenVideoId: String,
  heyGenStatus: String, // 'pending' | 'processing' | 'completed' | 'failed'
  avatarId: String,
  videoUrl: String,
  createdAt: String,
  updatedAt: String,
};

