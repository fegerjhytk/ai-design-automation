export type GenerationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface FlowSessionStatus {
  connected: boolean;
  authenticated: boolean;
  currentUrl?: string;
  activeProject?: string;
  creditsRemaining?: string | number;
  browserType?: 'cdp' | 'persistent_context' | 'none';
  message: string;
}

export interface FlowProject {
  id: string;
  name: string;
  url?: string;
  lastModified?: string;
}

export interface CreditsInfo {
  available: boolean;
  credits?: string | number;
  tier?: string;
  rawText?: string;
}

export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
export type VideoAspectRatio = '16:9' | '9:16';
export type VariantCount = 'x1' | 'x2' | 'x3' | 'x4';
export type VideoResolution = '360p' | '720p';
export type VideoDuration = '4s' | '6s' | '8s' | '10s' | number;
export type VideoSubTab = 'Frames' | 'Ingredients';

export type CameraMotion =
  | 'static'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'tilt_down'
  | 'zoom_in'
  | 'zoom_out';

export interface ImageGenerationRequest {
  prompt: string;
  aspectRatio: AspectRatio;
  model?: string;
  count?: VariantCount;
  style?: string;
  waitForCompletion?: boolean;
}

export interface VideoGenerationRequest {
  prompt: string;
  aspectRatio: VideoAspectRatio;
  mode?: VideoSubTab;
  model?: string;
  resolution?: VideoResolution;
  duration?: VideoDuration;
  count?: VariantCount;
  cameraMotion?: CameraMotion;
  durationSeconds?: number;
  waitForCompletion?: boolean;
}

export interface ImageAnimationRequest {
  imagePathOrUrl: string;
  prompt: string;
  aspectRatio?: VideoAspectRatio;
  mode?: VideoSubTab;
  model?: string;
  resolution?: VideoResolution;
  duration?: VideoDuration;
  count?: VariantCount;
  cameraMotion?: CameraMotion;
  waitForCompletion?: boolean;
}

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  aspectRatio?: AspectRatio;
  mediaUrl?: string;
  localPath?: string;
  createdAt: string;
  status: GenerationStatus;
}

export interface DownloadResult {
  success: boolean;
  localPath: string;
  fileName: string;
  byteSize: number;
  format: string;
  mimeType: string;
}

export interface JobStatusInfo {
  status: GenerationStatus;
  progressPercentage?: number;
  activeAssetType?: 'image' | 'video';
  message: string;
}

