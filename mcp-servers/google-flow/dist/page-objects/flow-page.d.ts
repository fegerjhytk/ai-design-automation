import type { Page } from 'playwright-core';
import type { FlowProject, CreditsInfo, ImageGenerationRequest, VideoGenerationRequest, ImageAnimationRequest, GeneratedAsset, JobStatusInfo } from '../types.js';
export declare class FlowPage {
    private page;
    constructor(page: Page);
    /**
     * Ensures the page is navigated to Google Flow.
     */
    ensureOnFlow(): Promise<void>;
    /**
     * Scans and returns existing projects on Google Flow.
     */
    listProjects(): Promise<FlowProject[]>;
    /**
     * Opens an existing project by ID or title, or creates a new project.
     */
    openProject(projectIdOrName?: string): Promise<{
        success: boolean;
        currentUrl: string;
        message: string;
    }>;
    /**
     * Scrapes and returns credits and quota information.
     */
    getCredits(): Promise<CreditsInfo>;
    /**
     * Executes Text-to-Image generation using Imagen on Google Flow.
     */
    generateImage(params: ImageGenerationRequest): Promise<GeneratedAsset>;
    /**
     * Helper to open the generation settings popover (aspect ratio, model, count).
     */
    private openSettingsPopover;
    /**
     * Helper to select aspect ratio.
     */
    private selectAspectRatio;
    /**
     * Helper to select model from dropdown if not already selected.
     */
    private selectModel;
    /**
     * Helper to select variant count (x1, x2, x3, x4).
     */
    private selectVariantCount;
    /**
     * Helper to select video sub-tab (Frames vs Ingredients).
     */
    private selectVideoSubTab;
    /**
     * Helper to select video resolution (360p, 720p).
     */
    private selectVideoResolution;
    /**
     * Helper to select video duration (4s, 6s, 8s, 10s).
     */
    private selectVideoDuration;
    /**
     * Helper to format camera motion instructions.
     */
    private formatCameraMotion;
    /**
     * Helper to fill prompt and trigger generation across image, video, and animation.
     */
    private fillPromptAndSubmit;
    /**
     * Executes Text-to-Video generation using Veo on Google Flow.
     */
    generateVideo(params: VideoGenerationRequest): Promise<GeneratedAsset>;
    /**
     * Executes Image-to-Video animation using a reference image.
     */
    animateImage(params: ImageAnimationRequest): Promise<GeneratedAsset>;
    /**
     * Inspects current generation progress and job status on Google Flow.
     */
    getJobStatus(): Promise<JobStatusInfo>;
}
//# sourceMappingURL=flow-page.d.ts.map