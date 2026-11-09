import type { Page } from 'playwright-core';
import fs from 'node:fs';
import { logger } from '../logger.js';
import type {
  FlowProject,
  CreditsInfo,
  ImageGenerationRequest,
  VideoGenerationRequest,
  ImageAnimationRequest,
  CameraMotion,
  GeneratedAsset,
  JobStatusInfo,
} from '../types.js';

export class FlowPage {
  constructor(private page: Page) {}

  /**
   * Ensures the page is navigated to Google Flow.
   */
  public async ensureOnFlow(): Promise<void> {
    const url = this.page.url();
    if (!url.includes('flow.google')) {
      logger.info('Navigating to https://flow.google...');
      await this.page.goto('https://flow.google', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Scans and returns existing projects on Google Flow.
   */
  public async listProjects(): Promise<FlowProject[]> {
    await this.ensureOnFlow();

    // Look for project cards or links in dashboard
    const projects: FlowProject[] = [];

    try {
      const projectElements = await this.page.$$(
        'a[href*="/project/"], [data-project-id], [role="article"], .project-card, div:has(> a[href*="/project/"])'
      );

      for (let i = 0; i < projectElements.length; i++) {
        const el = projectElements[i];
        const href = await el.getAttribute('href').catch(() => null);
        const text = (await el.innerText().catch(() => '')) || '';
        const titleMatch = text.split('\n')[0]?.trim() || `Project ${i + 1}`;
        const idMatch = href ? href.split('/project/')[1]?.split('?')[0] : `proj_${i + 1}`;

        if (idMatch) {
          projects.push({
            id: idMatch,
            name: titleMatch,
            url: href ? (href.startsWith('http') ? href : `https://flow.google${href}`) : undefined,
          });
        }
      }
    } catch (err) {
      logger.warn('Error querying project cards:', err);
    }

    logger.info('Discovered %d projects on Google Flow.', projects.length);
    return projects;
  }

  /**
   * Opens an existing project by ID or title, or creates a new project.
   */
  public async openProject(projectIdOrName?: string): Promise<{ success: boolean; currentUrl: string; message: string }> {
    await this.ensureOnFlow();

    if (projectIdOrName && projectIdOrName.toLowerCase() !== 'new') {
      logger.info('Attempting to open project: %s', projectIdOrName);

      // Try matching by exact ID link
      const directLink = await this.page.$(`a[href*="/project/${projectIdOrName}"]`);
      if (directLink) {
        await directLink.click();
        await this.page.waitForLoadState('domcontentloaded');
        return {
          success: true,
          currentUrl: this.page.url(),
          message: `Opened project ${projectIdOrName}`,
        };
      }

      // Try matching by text title
      const titleLink = await this.page.$(`text="${projectIdOrName}"`);
      if (titleLink) {
        await titleLink.click();
        await this.page.waitForLoadState('domcontentloaded');
        return {
          success: true,
          currentUrl: this.page.url(),
          message: `Opened project matching "${projectIdOrName}"`,
        };
      }
    }

    // Default: Click "New project" or "Create"
    let createButton = await this.page.$(
      '.new-project-button, button:has-text("New project"), [role="button"]:has-text("New project"), a[href*="/project/"]'
    );
    if (!createButton) {
      createButton = await this.page.$('text="New project"');
    }

    if (createButton) {
      await createButton.click();
      await this.page.waitForURL(/.*\/project\/.*/, { timeout: 15000 }).catch(() => {});
      await this.page.waitForTimeout(2500);
      return {
        success: true,
        currentUrl: this.page.url(),
        message: 'Created/opened new project workspace.',
      };
    }

    // Direct navigation fallback if button not found
    try {
      await this.page.goto('https://flow.google/studio', { waitUntil: 'domcontentloaded', timeout: 15000 });
      return {
        success: true,
        currentUrl: this.page.url(),
        message: 'Navigated to Google Flow studio workspace.',
      };
    } catch {
      return {
        success: true,
        currentUrl: this.page.url(),
        message: 'On current Google Flow workspace.',
      };
    }
  }

  /**
   * Scrapes and returns credits and quota information.
   */
  public async getCredits(): Promise<CreditsInfo> {
    await this.ensureOnFlow();

    try {
      // Look for credit badges or quota strings
      const badgeText = await this.page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        // Match expressions like "50 credits", "25 / 50 credits", "Credits: 100"
        const match = bodyText.match(/(\d+(?:\s*\/\s*\d+)?)\s*credits?/i);
        if (match) return match[0];

        // Search in header / nav elements
        const header = document.querySelector('header, nav, [role="banner"]');
        if (header) {
          const headerMatch = (header.textContent || '').match(/(\d+)\s*credits?/i);
          if (headerMatch) return headerMatch[0];
        }

        return null;
      });

      if (badgeText) {
        const numMatch = badgeText.match(/\d+/);
        return {
          available: true,
          credits: numMatch ? parseInt(numMatch[0], 10) : badgeText,
          rawText: badgeText,
        };
      }

      return {
        available: false,
        rawText: 'Credit badge not detected in current view. May be included with active Google AI subscription.',
      };
    } catch (err) {
      return {
        available: false,
        rawText: `Could not retrieve credits: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Executes Text-to-Image generation using Imagen on Google Flow.
   */
  public async generateImage(params: ImageGenerationRequest): Promise<GeneratedAsset> {
    await this.ensureOnFlow();

    // Ensure we are inside an active studio/editor project
    const url = this.page.url();
    if (!url.includes('/project/') && !url.includes('/studio')) {
      await this.openProject();
    }

    logger.info('Setting up image generation for prompt: "%s"', params.prompt);

    // 1. Ensure settings popover is open
    await this.openSettingsPopover();

    // 2. Switch to Image mode/tab if available
    const imageTab = await this.page.$(
      'button:has-text("Image"), [role="tab"]:has-text("Image"), [aria-label*="Image mode"]'
    );
    if (imageTab && await imageTab.isVisible().catch(() => false)) {
      await imageTab.click().catch(() => {});
      await this.page.waitForTimeout(500);
    }

    // 3. Select Aspect Ratio (mandatory user choice)
    if (params.aspectRatio) {
      await this.selectAspectRatio(params.aspectRatio);
    }

    // 3. Select Model (default: Nano Banana 2.1)
    if (params.model) {
      await this.selectModel(params.model);
    }

    // 4. Select Variant Count (default: x4)
    if (params.count) {
      await this.selectVariantCount(params.count);
    }

    // Full prompt with optional style
    const fullPrompt = params.style ? `${params.prompt}, ${params.style}` : params.prompt;
    await this.fillPromptAndSubmit(fullPrompt);
    const generationId = `img_${Date.now()}`;
    const createdAt = new Date().toISOString();

    // 5. Polling or waiting for completion if requested
    if (params.waitForCompletion !== false) {
      logger.info('Waiting for image generation to complete (polling up to 60s)...');
      await this.page.waitForTimeout(4000);
      const maxWaitMs = 60000;
      const startTime = Date.now();
      let mediaUrl: string | undefined;

      while (Date.now() - startTime < maxWaitMs) {
        const imgElements = await this.page.$$(
          'img[src*="googleusercontent.com"], img[src*="blob:"], .generated-asset img, [data-generated] img, img'
        );

        for (let i = imgElements.length - 1; i >= 0; i--) {
          const img = imgElements[i];
          const src = await img.getAttribute('src').catch(() => null);
          if (!src) continue;

          // Filter out user avatar, icons, branding
          if (
            src.includes('/ogw/') ||
            src.includes('=s32') ||
            src.includes('=s64') ||
            src.includes('=s96') ||
            src.includes('avatar') ||
            src.includes('profile') ||
            src.includes('favicon') ||
            src.includes('logo') ||
            src.includes('icon')
          ) {
            continue;
          }

          const box = await img.boundingBox().catch(() => null);
          if (box && (box.width < 100 || box.height < 100)) {
            continue;
          }

          mediaUrl = src;
          break;
        }

        if (mediaUrl) {
          break;
        }

        await this.page.waitForTimeout(2500);
      }

      logger.info('Image generation finished! Media URL: %s', mediaUrl || '(preview rendered on canvas)');
      return {
        id: generationId,
        type: 'image',
        prompt: fullPrompt,
        aspectRatio: params.aspectRatio,
        mediaUrl,
        createdAt,
        status: mediaUrl ? 'completed' : 'in_progress',
      };
    }

    return {
      id: generationId,
      type: 'image',
      prompt: fullPrompt,
      aspectRatio: params.aspectRatio,
      createdAt,
      status: 'pending',
    };
  }

  /**
   * Helper to open the generation settings popover (aspect ratio, model, count).
   */
  private async openSettingsPopover(): Promise<void> {
    try {
      // Check if ratio button or popover is already open
      const ratioBtn = await this.page.$('button:has-text("16:9"), [role="button"]:has-text("16:9")');
      if (ratioBtn && await ratioBtn.isVisible().catch(() => false)) {
        return;
      }

      // Click the settings / model pill button in the prompt bar
      const pill = await this.page.$(
        'button:has-text("Nano Banana"), button:has-text("Omni"), button:has-text("x1"), button:has-text("x4"), [aria-label*="settings" i], [aria-label*="model" i]'
      );
      if (pill) {
        logger.info('Opening settings popover from prompt bar pill...');
        await pill.click();
        await this.page.waitForTimeout(500);
      }
    } catch (err) {
      logger.warn('Could not open settings popover: %s', err);
    }
  }

  /**
   * Helper to select aspect ratio.
   */
  private async selectAspectRatio(ratio: string): Promise<void> {
    try {
      logger.info('Selecting aspect ratio: %s', ratio);
      const ratioBtn = await this.page.$(
        `button:has-text("${ratio}"), [role="button"]:has-text("${ratio}"), [aria-label*="${ratio}"]`
      );
      if (ratioBtn) {
        await ratioBtn.click().catch(() => {});
        await this.page.waitForTimeout(200);
      } else {
        const ratioDropdown = await this.page.$(
          'button[aria-label*="Aspect ratio"], button:has-text("Aspect ratio"), button:has-text("Ratio")'
        );
        if (ratioDropdown) {
          await ratioDropdown.click().catch(() => {});
          await this.page.waitForTimeout(300);
          const ratioOption = await this.page.$(`text="${ratio}"`);
          if (ratioOption) await ratioOption.click().catch(() => {});
        }
      }
    } catch (err) {
      logger.warn('Could not select aspect ratio %s: %s', ratio, err);
    }
  }

  /**
   * Helper to select model from dropdown if not already selected.
   */
  private async selectModel(modelName: string): Promise<void> {
    try {
      // Check if current model display already has modelName
      const modelTrigger = await this.page.$(
        `button:has-text("${modelName}"), [role="combobox"]:has-text("${modelName}"), [aria-label*="model"]:has-text("${modelName}")`
      );
      if (modelTrigger) {
        logger.info('Model %s already selected.', modelName);
        return;
      }

      // If not, find dropdown trigger
      const dropdown = await this.page.$(
        'button:has-text("Nano Banana"), button:has-text("Omni"), button:has-text("Veo"), button:has-text("Imagen"), [role="combobox"], [aria-haspopup="listbox"], button[aria-label*="model"]'
      );
      if (dropdown) {
        await dropdown.click().catch(() => {});
        await this.page.waitForTimeout(300);
        const option = await this.page.$(`text="${modelName}", [role="option"]:has-text("${modelName}")`);
        if (option) {
          await option.click().catch(() => {});
          await this.page.waitForTimeout(300);
        } else {
          const baseName = modelName.replace(/^[^\w]+/, '').trim();
          const altOption = await this.page.$(`text="${baseName}"`);
          if (altOption) {
            await altOption.click().catch(() => {});
            await this.page.waitForTimeout(300);
          }
        }
      }
    } catch (err) {
      logger.warn('Could not select model %s: %s', modelName, err);
    }
  }

  /**
   * Helper to select variant count (x1, x2, x3, x4).
   */
  private async selectVariantCount(count: string): Promise<void> {
    try {
      const countBtn = await this.page.$(
        `button:text-is("${count}"), [role="button"]:text-is("${count}"), button:has-text("${count}")`
      );
      if (countBtn) {
        await countBtn.click().catch(() => {});
        await this.page.waitForTimeout(200);
      }
    } catch (err) {
      logger.warn('Could not select variant count %s: %s', count, err);
    }
  }

  /**
   * Helper to select video sub-tab (Frames vs Ingredients).
   */
  private async selectVideoSubTab(subTab: string): Promise<void> {
    try {
      const tabBtn = await this.page.$(
        `button:has-text("${subTab}"), [role="tab"]:has-text("${subTab}")`
      );
      if (tabBtn) {
        await tabBtn.click().catch(() => {});
        await this.page.waitForTimeout(300);
      }
    } catch (err) {
      logger.warn('Could not select video sub-tab %s: %s', subTab, err);
    }
  }

  /**
   * Helper to select video resolution (360p, 720p).
   */
  private async selectVideoResolution(res: string): Promise<void> {
    try {
      const resBtn = await this.page.$(
        `button:has-text("${res}"), [role="button"]:has-text("${res}")`
      );
      if (resBtn) {
        await resBtn.click().catch(() => {});
        await this.page.waitForTimeout(200);
      }
    } catch (err) {
      logger.warn('Could not select resolution %s: %s', res, err);
    }
  }

  /**
   * Helper to select video duration (4s, 6s, 8s, 10s).
   */
  private async selectVideoDuration(dur: string): Promise<void> {
    try {
      const durBtn = await this.page.$(
        `button:text-is("${dur}"), [role="button"]:text-is("${dur}"), button:has-text("${dur}")`
      );
      if (durBtn) {
        await durBtn.click().catch(() => {});
        await this.page.waitForTimeout(200);
      }
    } catch (err) {
      logger.warn('Could not select duration %s: %s', dur, err);
    }
  }

  /**
   * Helper to format camera motion instructions.
   */
  private formatCameraMotion(motion?: CameraMotion): string {
    switch (motion) {
      case 'pan_left':
        return 'Pan camera left';
      case 'pan_right':
        return 'Pan camera right';
      case 'tilt_up':
        return 'Tilt camera up';
      case 'tilt_down':
        return 'Tilt camera down';
      case 'zoom_in':
        return 'Zoom camera in';
      case 'zoom_out':
        return 'Zoom camera out';
      case 'static':
        return 'Static locked-off shot, no camera motion';
      default:
        return '';
    }
  }

  /**
   * Helper to fill prompt and trigger generation across image, video, and animation.
   */
  private async fillPromptAndSubmit(promptText: string): Promise<void> {
    // 1. Dismiss any intro/welcome modals if visible
    try {
      const dismissButtons = await this.page.$$(
        'button:has-text("Got it"), button:has-text("Dismiss"), button:has-text("Next"), button:has-text("Close"), button:has-text("Accept"), button:has-text("Agree"), [aria-label*="Close"]'
      );
      for (const btn of dismissButtons) {
        if (await btn.isVisible().catch(() => false)) {
          await btn.click().catch(() => {});
          await this.page.waitForTimeout(300);
        }
      }
    } catch {
      // Ignore
    }

    // 2. Find all potential prompt input fields and locate the visible one
    const inputSelectors = [
      'input[placeholder*="create" i]',
      'textarea[placeholder*="create" i]',
      '[placeholder*="What do you want to create?" i]',
      'textarea[placeholder*="Describe" i]',
      'textarea[placeholder*="prompt" i]',
      '[contenteditable="true"]',
      'textarea',
      '[role="textbox"]',
      'input[type="text"]',
    ];

    let targetInput: any = null;
    for (const selector of inputSelectors) {
      const elements = await this.page.$$(selector);
      for (const el of elements) {
        if (await el.isVisible().catch(() => false)) {
          targetInput = el;
          break;
        }
      }
      if (targetInput) break;
    }

    if (!targetInput) {
      throw new Error('Could not locate visible prompt input field on Google Flow editor page.');
    }

    logger.info('Focusing and entering prompt into Google Flow prompt bar...');
    await targetInput.click().catch(() => {});
    await this.page.waitForTimeout(200);

    // Try fill with short timeout, fallback to keyboard typing
    try {
      await targetInput.fill(promptText, { timeout: 3000 });
    } catch {
      logger.info('Direct fill not accepted, typing via keyboard...');
      await targetInput.focus().catch(() => {});
      await this.page.keyboard.press('Meta+A').catch(() => {});
      await this.page.keyboard.press('Control+A').catch(() => {});
      await this.page.keyboard.press('Backspace').catch(() => {});
      await this.page.keyboard.insertText(promptText).catch(async () => {
        await this.page.keyboard.type(promptText, { delay: 10 });
      });
    }

    await this.page.waitForTimeout(400);

    // 3. Locate and click Generate button (or press Enter)
    logger.info('Submitting generation...');
    const btnSelectors = [
      'button:has-text("Generate")',
      'button[aria-label*="Generate"]',
      'button[type="submit"]',
      'button:has-text("Create")',
      'button[aria-label*="Send"]',
      'button[aria-label*="Submit"]',
      'button:has([data-icon*="send"])',
      'button:has([data-icon*="arrow"])',
      'button:has(svg)',
    ];

    let submitBtn: any = null;
    for (const selector of btnSelectors) {
      const buttons = await this.page.$$(selector);
      for (const btn of buttons) {
        if (await btn.isVisible().catch(() => false)) {
          const text = (await btn.innerText().catch(() => '')).toLowerCase();
          const aria = (await btn.getAttribute('aria-label').catch(() => ''))?.toLowerCase() || '';
          if (
            text.includes('generate') ||
            text.includes('create') ||
            aria.includes('generate') ||
            aria.includes('submit') ||
            aria.includes('send')
          ) {
            submitBtn = btn;
            break;
          }
        }
      }
      if (submitBtn) break;
    }

    if (submitBtn) {
      await submitBtn.click();
    } else {
      logger.info('Generate button not directly identifiable, submitting via Enter keystroke...');
      await this.page.keyboard.press('Enter');
    }
  }

  /**
   * Executes Text-to-Video generation using Veo on Google Flow.
   */
  public async generateVideo(params: VideoGenerationRequest): Promise<GeneratedAsset> {
    await this.ensureOnFlow();

    const url = this.page.url();
    if (!url.includes('/project/') && !url.includes('/studio')) {
      await this.openProject();
    }

    logger.info('Setting up video generation for prompt: "%s"', params.prompt);

    // 1. Switch to Video mode
    const videoTab = await this.page.$(
      'button:has-text("Video"), [role="tab"]:has-text("Video"), [aria-label*="Video mode"]'
    );
    if (videoTab) {
      await videoTab.click().catch(() => {});
      await this.page.waitForTimeout(500);
    }

    // 2. Select sub-tab (default: Ingredients)
    if (params.mode) {
      await this.selectVideoSubTab(params.mode);
    }

    // 3. Select Aspect Ratio (mandatory user choice)
    if (params.aspectRatio) {
      await this.selectAspectRatio(params.aspectRatio);
    }

    // 4. Select Model (default: Omni 1.1 Flash)
    if (params.model) {
      await this.selectModel(params.model);
    }

    // 5. Select Resolution (default: 360p)
    if (params.resolution) {
      await this.selectVideoResolution(params.resolution);
    }

    // 6. Select Duration (default: 10s)
    if (params.duration) {
      await this.selectVideoDuration(String(params.duration));
    }

    // 7. Select Variant Count (default: x1)
    if (params.count) {
      await this.selectVariantCount(params.count);
    }

    // 8. Configure camera motion
    let motionInstruction = '';
    if (params.cameraMotion) {
      motionInstruction = this.formatCameraMotion(params.cameraMotion);
      const cameraBtn = await this.page.$(
        'button[aria-label*="Camera"], button:has-text("Camera"), button:has-text("Motion")'
      );
      if (cameraBtn) {
        await cameraBtn.click().catch(() => {});
        await this.page.waitForTimeout(300);
        const motionOption = await this.page.$(`text="${motionInstruction}"`);
        if (motionOption) await motionOption.click().catch(() => {});
      }
    }

    const fullPrompt = motionInstruction
      ? `[Camera: ${motionInstruction}] ${params.prompt}`
      : params.prompt;

    await this.fillPromptAndSubmit(fullPrompt);
    const generationId = `vid_${Date.now()}`;
    const createdAt = new Date().toISOString();

    // 6. Polling if requested
    if (params.waitForCompletion !== false) {
      logger.info('Waiting for video generation to complete (polling up to 90s)...');
      const maxWaitMs = 90000;
      const startTime = Date.now();
      let mediaUrl: string | undefined;

      while (Date.now() - startTime < maxWaitMs) {
        const videoElement = await this.page.$('video[src], video source[src], a[href*=".mp4"]');
        if (videoElement) {
          const src =
            (await videoElement.getAttribute('src').catch(() => null)) ||
            (await videoElement.getAttribute('href').catch(() => null));
          if (src) {
            mediaUrl = src;
            break;
          }
        }

        const spinner = await this.page.$(
          '[role="progressbar"], .loading-spinner, [aria-busy="true"]'
        );
        if (!spinner && Date.now() - startTime > 10000) {
          const finalVideo = await this.page.$('video');
          if (finalVideo) {
            mediaUrl = (await finalVideo.getAttribute('src').catch(() => undefined)) || undefined;
            break;
          }
        }

        await this.page.waitForTimeout(3000);
      }

      logger.info('Video generation finished! Media URL: %s', mediaUrl || '(preview rendered on canvas)');
      return {
        id: generationId,
        type: 'video',
        prompt: fullPrompt,
        aspectRatio: params.aspectRatio,
        mediaUrl,
        createdAt,
        status: mediaUrl ? 'completed' : 'in_progress',
      };
    }

    return {
      id: generationId,
      type: 'video',
      prompt: fullPrompt,
      aspectRatio: params.aspectRatio,
      createdAt,
      status: 'pending',
    };
  }

  /**
   * Executes Image-to-Video animation using a reference image.
   */
  public async animateImage(params: ImageAnimationRequest): Promise<GeneratedAsset> {
    await this.ensureOnFlow();

    const url = this.page.url();
    if (!url.includes('/project/') && !url.includes('/studio')) {
      await this.openProject();
    }

    logger.info('Setting up image-to-video animation for image: %s', params.imagePathOrUrl);

    // 1. Switch to Video mode
    const videoTab = await this.page.$(
      'button:has-text("Video"), [role="tab"]:has-text("Video"), [aria-label*="Video mode"]'
    );
    if (videoTab) {
      await videoTab.click().catch(() => {});
      await this.page.waitForTimeout(500);
    }

    // 2. Select sub-tab (default: Ingredients)
    if (params.mode) {
      await this.selectVideoSubTab(params.mode);
    }

    // 3. Select Aspect Ratio if specified
    if (params.aspectRatio) {
      await this.selectAspectRatio(params.aspectRatio);
    }

    // 4. Select Model (default: Omni 1.1 Flash)
    if (params.model) {
      await this.selectModel(params.model);
    }

    // 5. Select Resolution (default: 360p)
    if (params.resolution) {
      await this.selectVideoResolution(params.resolution);
    }

    // 6. Select Duration (default: 10s)
    if (params.duration) {
      await this.selectVideoDuration(String(params.duration));
    }

    // 7. Select Variant Count (default: x1)
    if (params.count) {
      await this.selectVariantCount(params.count);
    }

    // 8. Upload reference image if local file
    if (fs.existsSync(params.imagePathOrUrl)) {
      logger.info('Uploading reference image: %s', params.imagePathOrUrl);
      const fileInput = await this.page.$(
        'input[type="file"][accept*="image"], input[type="file"]'
      );
      if (fileInput) {
        await fileInput.setInputFiles(params.imagePathOrUrl);
        await this.page.waitForTimeout(1000);
      } else {
        const uploadBtn = await this.page.$(
          'button[aria-label*="Upload"], button:has-text("Add image"), [aria-label*="reference"]'
        );
        if (uploadBtn) {
          const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
          await uploadBtn.click();
          const fileChooser = await fileChooserPromise;
          if (fileChooser) {
            await fileChooser.setFiles(params.imagePathOrUrl);
            await this.page.waitForTimeout(1000);
          }
        }
      }
    }

    // 3. Format prompt with camera motion
    let motionInstruction = '';
    if (params.cameraMotion) {
      motionInstruction = this.formatCameraMotion(params.cameraMotion);
    }

    const fullPrompt = motionInstruction
      ? `[Camera: ${motionInstruction}] ${params.prompt}`
      : params.prompt;

    await this.fillPromptAndSubmit(fullPrompt);
    const generationId = `anim_${Date.now()}`;
    const createdAt = new Date().toISOString();

    // 6. Polling if requested
    if (params.waitForCompletion !== false) {
      logger.info('Waiting for image animation to complete (polling up to 90s)...');
      const maxWaitMs = 90000;
      const startTime = Date.now();
      let mediaUrl: string | undefined;

      while (Date.now() - startTime < maxWaitMs) {
        const videoElement = await this.page.$('video[src], video source[src], a[href*=".mp4"]');
        if (videoElement) {
          const src =
            (await videoElement.getAttribute('src').catch(() => null)) ||
            (await videoElement.getAttribute('href').catch(() => null));
          if (src) {
            mediaUrl = src;
            break;
          }
        }

        const spinner = await this.page.$(
          '[role="progressbar"], .loading-spinner, [aria-busy="true"]'
        );
        if (!spinner && Date.now() - startTime > 10000) {
          const finalVideo = await this.page.$('video');
          if (finalVideo) {
            mediaUrl = (await finalVideo.getAttribute('src').catch(() => undefined)) || undefined;
            break;
          }
        }

        await this.page.waitForTimeout(3000);
      }

      logger.info('Animation finished! Media URL: %s', mediaUrl || '(preview rendered on canvas)');
      return {
        id: generationId,
        type: 'video',
        prompt: fullPrompt,
        mediaUrl,
        createdAt,
        status: mediaUrl ? 'completed' : 'in_progress',
      };
    }

    return {
      id: generationId,
      type: 'video',
      prompt: fullPrompt,
      createdAt,
      status: 'pending',
    };
  }

  /**
   * Inspects current generation progress and job status on Google Flow.
   */
  public async getJobStatus(): Promise<JobStatusInfo> {
    await this.ensureOnFlow();

    try {
      const isBusy = await this.page.$(
        '[role="progressbar"], .loading-spinner, [aria-busy="true"], .rendering-card'
      );

      if (isBusy) {
        const percentage = await this.page.evaluate(() => {
          const bodyText = document.body.innerText || '';
          const match = bodyText.match(/\b(\d{1,3})%\b/);
          return match ? parseInt(match[1], 10) : undefined;
        });

        const isVideoActive = await this.page.$(
          'button[aria-selected="true"]:has-text("Video"), [role="tab"][aria-selected="true"]:has-text("Video")'
        );

        return {
          status: 'in_progress',
          progressPercentage: percentage,
          activeAssetType: isVideoActive ? 'video' : 'image',
          message: percentage !== undefined ? `Generation in progress (${percentage}%)` : 'Generation actively in progress...',
        };
      }

      const hasMedia = await this.page.$(
        'video[src], img[src*="googleusercontent.com"], img[src*="blob:"]'
      );

      if (hasMedia) {
        return {
          status: 'completed',
          progressPercentage: 100,
          message: 'Generation completed. Asset is ready in workspace.',
        };
      }

      return {
        status: 'pending',
        message: 'No active generation job detected.',
      };
    } catch (err) {
      return {
        status: 'failed',
        message: `Error inspecting job status: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
