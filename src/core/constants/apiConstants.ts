export class ApiConstants {
  // Environment configuration
  static readonly _isLocalDevelopment: boolean = false; // Set to true for local development

  // API Gateway base URL - routes to all microservices
  static get gatewayBaseUrl(): string {
    return ApiConstants._isLocalDevelopment ? 'http://localhost:3000' : 'https://staging.syncup.in';
  }

  // Service-specific base URLs - Environment-aware (for direct service access if needed)
  static get authBaseUrl(): string { return ApiConstants._isLocalDevelopment ? 'http://localhost:3011' : 'https://staging.syncup.in'; }
  static get postBaseUrl(): string { return ApiConstants._isLocalDevelopment ? 'http://localhost:3008' : 'https://staging.syncup.in'; }
  static get chatBaseUrl(): string { return ApiConstants._isLocalDevelopment ? 'http://localhost:3007' : 'https://staging.syncup.in'; }
  static get resumeBaseUrl(): string { return ApiConstants._isLocalDevelopment ? 'http://localhost:3005' : 'https://staging.syncup.in'; }
  static get jobBaseUrl(): string { return ApiConstants._isLocalDevelopment ? 'http://localhost:3011' : 'https://staging.syncup.in'; }
  static get companyBaseUrl(): string { return ApiConstants._isLocalDevelopment ? 'http://localhost:3011' : 'https://staging.syncup.in'; }
  static get connectionBaseUrl(): string { return ApiConstants._isLocalDevelopment ? 'http://localhost:3009' : 'https://staging.syncup.in'; }
  static get adminBaseUrl(): string { return ApiConstants._isLocalDevelopment ? 'http://localhost:3010' : 'https://staging.syncup.in'; }

  // Default base URL (API Gateway)
  static get baseUrl(): string { return ApiConstants.gatewayBaseUrl; }

  // ── Public web origin (user-facing shareable links) ─────────────────────────
  // The origin for links a user shares OUTSIDE the app (profile CV, etc.). This
  // is deliberately NOT tied to `_isLocalDevelopment`: a share link must always
  // point at a real, openable web origin — never `localhost`. Flip to
  // `https://syncup.in` for production.
  static readonly publicWebBaseUrl = `https://staging.syncup.in`;

  // ── Legal ───────────────────────────────────────────────────────────────────
  // Deliberately NOT derived from `publicWebBaseUrl`: these are the URLs the
  // Play Store and App Store listings point at, and both stores require them to
  // resolve on the public production site in every build. Tying them to an
  // environment-switched origin would ship a staging link in a release, which
  // is a listing violation if staging is ever taken down or auth-gated.
  static readonly privacyPolicyUrl = `https://www.syncup.in/privacy-policy`;
  static readonly termsUrl = `https://www.syncup.in/terms-and-conditions`;

  // Canonical public profile link, matching the web app's CV route
  // (`/user/cv/{handle}`). [handle] is the custom userId, e.g.
  // `nitin-jiwnani-1` — not the internal UUID.
  static profileCvUrl(handle: string): string { return `${ApiConstants.publicWebBaseUrl}/user/cv/${handle}`; }

  // Canonical public post link, matching the web app's post route
  // (`/post/{postId}`). Built on [publicWebBaseUrl] so it points at the SAME
  // environment the app's posts actually live in — currently staging. (An
  // earlier hardcoded `www.syncup.in` produced "post unavailable" links because
  // posts created via the app live in the staging DB, not production.) Flip
  // [publicWebBaseUrl] to the prod origin when the app moves to production.
  // [postId] is the post's MongoDB id from the feed model.
  static postShareUrl(postId: string): string { return `${ApiConstants.publicWebBaseUrl}/post/${postId}`; }

  // Canonical public job link, matching the web app's seeker-facing route
  // (`/findjobs/{jobId}`). This is a shareable web URL, not an API endpoint.
  static jobShareUrl(jobId: string): string { return `${ApiConstants.publicWebBaseUrl}/findjobs/${encodeURIComponent(jobId)}`; }

  // Service-specific URL builders - using API Gateway
  static auth(path: string): string { return `${ApiConstants.gatewayBaseUrl}${path}`; }
  static post(path: string): string { return `${ApiConstants.gatewayBaseUrl}${path}`; }
  static chat(path: string): string { return `${ApiConstants.gatewayBaseUrl}${path}`; }
  static resume(path: string): string { return `${ApiConstants.gatewayBaseUrl}${path}`; }
  static job(path: string): string { return `${ApiConstants.gatewayBaseUrl}${path}`; }
  static company(path: string): string { return `${ApiConstants.gatewayBaseUrl}${path}`; }
  static connection(path: string): string { return `${ApiConstants.gatewayBaseUrl}${path}`; }
  static interview(path: string): string { return `${ApiConstants.gatewayBaseUrl}${path}`; }
  static admin(path: string): string { return `${ApiConstants.gatewayBaseUrl}${path}`; }
  static user(path: string): string { return `${ApiConstants.gatewayBaseUrl}${path}`; } // User endpoints are in auth service

  // Direct service access (if needed for debugging)
  static authDirect(path: string): string { return `${ApiConstants.authBaseUrl}${path}`; }
  static postDirect(path: string): string { return `${ApiConstants.postBaseUrl}${path}`; }
  static chatDirect(path: string): string { return `${ApiConstants.chatBaseUrl}${path}`; }
  static resumeDirect(path: string): string { return `${ApiConstants.resumeBaseUrl}${path}`; }
  static jobDirect(path: string): string { return `${ApiConstants.jobBaseUrl}${path}`; }
  static companyDirect(path: string): string { return `${ApiConstants.companyBaseUrl}${path}`; }
  static connectionDirect(path: string): string { return `${ApiConstants.connectionBaseUrl}${path}`; }
  static adminDirect(path: string): string { return `${ApiConstants.adminBaseUrl}${path}`; }

  // ===========================================
  // AUTH SERVICE ENDPOINTS
  // ===========================================

  // Authentication Routes
  static get authRegister(): string { return `/api/auth-service/auth/register`; }
  static get authRegisterInit(): string { return `/api/auth-service/auth/register/init`; }
  static get authRegisterComplete(): string { return `/api/auth-service/auth/register/complete`; }
  static get authLogin(): string { return `/api/auth-service/auth/login`; }
  static get authForgotPassword(): string { return `/api/auth-service/auth/forgot-password`; }
  static get authResetPassword(): string { return `/api/auth-service/auth/reset-password`; }
  static get authVerifyOtp(): string { return `/api/auth-service/auth/verify-otp`; }
  static get authResendOtp(): string { return `/api/auth-service/auth/resend-otp`; }
  static get authCheckEmail(): string { return `/api/auth-service/auth/check-email`; }
  // check-phone-otp intentionally absent — see AuthService.
  static get authGoogle(): string { return `/api/auth-service/auth/google`; }
  static get authGoogleCallback(): string { return `/api/auth-service/auth/google/callback`; }
  static get authGoogleMobile(): string { return `/api/auth-service/auth/google/mobile`; }
  static get authSession(): string { return `/api/auth-service/auth/session`; }

  // Access tokens are short-lived (staging mints `expiresIn: 900` — 15 min),
  // which a multi-screen flow like onboarding routinely outlives. Exchanging
  // the refresh token here is what keeps those flows alive. The refresh token
  // is ROTATED on every call and reuse revokes the whole family, so this must
  // only ever be called through AuthManager's single-flight guard.
  static get authRefresh(): string { return `/api/auth-service/auth/refresh`; }
  static get authVerifyPhoneOtp(): string { return `/api/auth-service/auth/verify-otp/phone`; }
  // Backend-generated phone OTP SEND (WhatsApp-first). Body {phone, channel} →
  // {expiresInSeconds, resendAfterSeconds, channel}. NOTE: there is no matching
  // backend endpoint to VERIFY this code yet — see AuthConfig.useBackendPhoneOtp.
  static get authSendPhoneOtp(): string { return `/api/auth-service/auth/send-phone-otp`; }

  // ── Phone-first signup (Onboarding tag in /api/docs.json) ───────────────────
  // verify-otp is the login-vs-signup gate; the rest continue an incomplete
  // signup. refresh-intent and complete-email require the stub Bearer.
  static get authPhoneSignupVerifyOtp(): string { return `/api/auth-service/auth/phone-signup/verify-otp`; }
  static get authPhoneSignupRefreshIntent(): string { return `/api/auth-service/auth/phone-signup/refresh-intent`; }
  static get authPhoneSignupCompleteEmail(): string { return `/api/auth-service/auth/phone-signup/complete-email`; }
  static get authSendEmailOtp(): string { return `/api/auth-service/auth/send-email-otp`; }
  static get authVerifyEmailOtp(): string { return `/api/auth-service/auth/verify-email-otp`; }
  static get userOnboardingProgress(): string { return `/api/auth-service/user/onboarding-progress`; }

  // User Routes
  static get userSearchUsers(): string { return `/api/auth-service/user/search-users`; }
  static get userSearch(): string { return `/api/auth-service/user/search`; }
  static get userSuggestions(): string { return `/api/auth-service/user/suggestions`; }
  static userPublicProfile(userId: string): string { return `/api/auth-service/user/public/${userId}`; }
  static get userAll(): string { return `/api/auth-service/user/all`; }
  static get userEmail(): string { return `/api/auth-service/user/email`; }
  static get userImpression(): string { return `/api/auth-service/user/impression`; }
  static get userUpdate(): string { return `/api/auth-service/user/`; }
  static get userUpdateEmail(): string { return `/api/auth-service/user/email`; }
  static get userUpdatePhone(): string { return `/api/auth-service/user/phone`; }
  static get userUpdateOpenTo(): string { return `/api/auth-service/user/open-to`; }
  static get userUpdateBio(): string { return `/api/auth-service/user/bio`; }
  static get userProfilePictureUploadUrl(): string { return `/api/auth-service/user/profile-picture/upload-url`; }
  static get userProfilePicture(): string { return `/api/auth-service/user/profile-picture`; }
  static get userBannerUploadUrl(): string { return `/api/auth-service/user/banner/upload-url`; }
  static get userBanner(): string { return `/api/auth-service/user/banner`; }
  static get userProfileCompletionStatus(): string { return `/api/auth-service/user/profile-completion-status`; }
  static get userGender(): string { return `/api/auth-service/user/gender`; }

  // Bookmark Routes (served by auth-service)
  static get userBookmarkToggle(): string { return `/api/auth-service/user/bookmark/toggle`; }
  static userBookmarks(userId: string): string { return `/api/auth-service/user/${userId}/bookmarks`; }

  // ===========================================
  // COMPANY SERVICE ENDPOINTS
  // ===========================================

  // Company Routes
  static get companyDetails(): string { return `/api/company-service/company/details`; }
  static get companySearch(): string { return `/api/company-service/company/search`; }
  static get companyLocations(): string { return `/api/company-service/locations`; }
  static get companySearchMatching(): string { return `/api/company-service/company/search/matching`; }
  static companyBySlug(slug: string): string { return `/api/company-service/company/${slug}`; }
  static get companyMyCompanies(): string { return `/api/company-service/company/my/companies`; }
  static companyFollow(slug: string): string { return `/api/company-service/company/${slug}/follow`; }
  static companyUnfollow(slug: string): string { return `/api/company-service/company/${slug}/follow`; } // DELETE method
  static companyFollowStatus(slug: string): string { return `/api/company-service/company/${slug}/follow-status`; }
  static companyUpdate(slug: string): string { return `/api/company-service/company/${slug}`; }
  static companyLogo(slug: string): string { return `/api/company-service/company/${slug}/logo`; }
  static companyLogoDelete(slug: string): string { return `/api/company-service/company/${slug}/logo`; } // DELETE method
  static companyBanner(slug: string): string { return `/api/company-service/company/${slug}/banner`; }
  static companyBannerDelete(slug: string): string { return `/api/company-service/company/${slug}/banner`; } // DELETE method
  static companyMedia(slug: string): string { return `/api/company-service/company/${slug}/media`; }
  static companyMediaById(slug: string, mediaId: string): string { return `/api/company-service/company/${slug}/media/${mediaId}`; }
  static companyMediaDelete(slug: string, mediaId: string): string { return `/api/company-service/company/${slug}/media/${mediaId}`; } // DELETE method
  static companyMediaReorder(slug: string): string { return `/api/company-service/company/${slug}/media/reorder`; }
  static get companyProfilePictureUploadUrl(): string { return `/api/company-service/company/profile-picture/upload-url`; }
  static get companyProfilePicture(): string { return `/api/company-service/company/profile-picture`; }
  static get companyBannerUploadUrl(): string { return `/api/company-service/company/banner/upload-url`; }
  static get companyBannerUpdate(): string { return `/api/company-service/company/banner`; }
  static get companyCreate(): string { return `/api/company-service/company/create`; }

  // File Routes
  static get companyAwsSignedUploadUrl(): string { return `/api/company-service/file/aws-signed-upload-url`; }
  static get companyMediaUploadUrl(): string { return `/api/company-service/file/company-media-upload-url`; }

  // ===========================================
  // RESUME SERVICE ENDPOINTS
  // ===========================================

  // Resume Routes
  static get resumeLocations(): string { return `/api/resume-service/locations`; }
  static get resumeSuggestionsSimilar(): string { return `/api/resume-service/resume/suggestions/similar`; }
  static get resumeUserJobTitles(): string { return `/api/resume-service/user/job-titles`; }
  static get resumeWorkDetailsMe(): string { return `/api/resume-service/resume/work-details/me`; }
  static resumeWorkDetailsPublic(userId: string): string { return `/api/resume-service/resume/work-details/public/${userId}`; }
  static get resumeCurrentLocation(): string { return `/api/resume-service/resume/work-details/current-location`; }
  static get resumePreferredLocation(): string { return `/api/resume-service/resume/work-details/preferred-location`; }
  static get resumeCompensation(): string { return `/api/resume-service/resume/work-details/compensation`; }
  static get resumeKeySkills(): string { return `/api/resume-service/resume/work-details/key-skills`; }

  // `{interests: [...]}` — values must come from
  // [OnboardingCatalog.interests]; the endpoint 400s on anything else.
  static get resumeInterest(): string { return `/api/resume-service/resume/work-details/interest`; }

  // Marker PUT with **no body** — flags the account as taking the fresher
  // branch of onboarding.
  static get resumeOnboardingFresher(): string { return `/api/resume-service/resume/work-details/onboarding-fresher`; }
  static get resumeProfileLinks(): string { return `/api/resume-service/resume/work-details/profile-links`; }
  static get resumeProfileTheme(): string { return `/api/resume-service/resume/work-details/profile-theme`; }
  static get resumePersonalWebsite(): string { return `/api/resume-service/resume/work-details/personal-website`; }
  static get resumeJobRole(): string { return `/api/resume-service/resume/work-details/job-role`; }
  static get resumeDepartmentIndustry(): string { return `/api/resume-service/resume/work-details/department-industry`; }
  static get resumeDepartments(): string { return `/api/resume-service/departments`; }
  static get resumeIndustries(): string { return `/api/resume-service/industries`; }
  static get resumeWorkDetails(): string { return `/api/resume-service/resume/work-details`; }
  static resumeUserLatest(userId: string): string { return `/api/resume-service/resume/user/${userId}/latest`; }
  // Presigned-URL generator. `resumeKey` goes in the QUERY STRING (verified
  // Swagger 2026-07-16) — it contains slashes ("resumes/…"), so a path segment
  // would break routing. Was previously (unused and) wrongly a path builder.
  static get resumeDownload(): string { return `/api/resume-service/resume/download`; }
  // Delete by resume record id (from `resume/user/{userId}/latest` / upload).
  static resumeDelete(resumeId: string): string { return `/api/resume-service/resume/${resumeId}`; }
  static get resumeUpload(): string { return `/api/resume-service/resume/upload`; }
  static get resumeUpdateJobRole(): string { return `/api/resume-service/resume/work-details/job-role`; }
  static get resumeParsedData(): string { return `/api/resume-service/resume/get-parsed-resume-data`; }
  static get resumeAddWorkDetails(): string { return `/api/resume-service/resume/work-details/add`; }
  static get resumeSkills(): string { return `/api/resume-service/resume/work-details/skills`; }
  static get resumeCreateSkill(): string { return `/api/resume-service/resume/work-details/skill/create`; }
  static get resumeCreateSkillBatch(): string { return `/api/resume-service/resume/work-details/skill/create-batch`; }
  static get resumeDeleteSkill(): string { return `/api/resume-service/resume/work-details/skill/delete`; }
  static get resumeDeleteSkillBatch(): string { return `/api/resume-service/resume/work-details/skill/delete-batch`; }
  static get resumeLanguages(): string { return `/api/resume-service/resume/work-details/languages`; }
  static get resumeUpdateCurrentCompany(): string { return `/api/resume-service/resume/work-details/currentCompany`; }
  static get resumeUpdateJobSeekingStatus(): string { return `/api/resume-service/resume/work-details/job-seeking-status`; }
  static get resumeUpdateInterest(): string { return `/api/resume-service/resume/work-details/interest`; }
  static get resumeRemoveInterest(): string { return `/api/resume-service/resume/work-details/interest`; }
  static get resumeUpdateInspiredBy(): string { return `/api/resume-service/resume/work-details/inspiredby`; }

  // Skill Routes
  static skillAllByUser(userId: string): string { return `/api/resume-service/skill/all/${userId}`; }
  static get skillCategories(): string { return `/api/resume-service/skill/categories`; }

  // Experience Routes
  static experienceAllByUser(id: string): string { return `/api/resume-service/experience/all/${id}`; }
  // NO trailing slash, matching Swagger and for the same reason as
  // [educationCreate] — this create had the identical trailing-slash shape.
  static get experienceCreate(): string { return `/api/resume-service/experience`; }
  static experienceUpdate(experienceId: string): string { return `/api/resume-service/experience/${experienceId}`; }
  static experienceDelete(experienceId: string): string { return `/api/resume-service/experience/${experienceId}`; }
  static get experienceAll(): string { return `/api/resume-service/experience/all`; }
  static experienceById(experienceId: string): string { return `/api/resume-service/experience/${experienceId}`; }

  // Intro Media Routes
  static get resumeIntroMediaUploadUrl(): string { return `/api/resume-service/resume/intro-media/upload-url`; }
  static get resumeIntroMedia(): string { return `/api/resume-service/resume/intro-media`; }
  static get resumeIntroMediaVisibility(): string { return `/api/resume-service/resume/intro-media/visibility`; }

  // Projects Routes
  static get projectsCreate(): string { return `/api/resume-service/projects`; }
  static get projectsAll(): string { return `/api/resume-service/projects/all`; }
  static projectsAllByUser(userId: string): string { return `/api/resume-service/projects/all/${userId}`; }
  static projectUpdate(projectId: string): string { return `/api/resume-service/projects/${projectId}`; }
  static projectDelete(projectId: string): string { return `/api/resume-service/projects/${projectId}`; }
  static get projectsMediaUploadUrl(): string { return `/api/resume-service/projects/media/upload-url`; }

  // Education Routes
  static educationAllByUser(id: string): string { return `/api/resume-service/education/all/${id}`; }
  // NO trailing slash — Swagger documents `POST /api/resume-service/education`,
  // and the trailing-slash variant this used to send was reaching a handler
  // that ignored the request body and persisted `school: "Unknown School"` with
  // a null degree/field (reproduced 2026-08-08 via the fresher onboarding
  // branch). `PUT /education/{id}`, which never had a trailing slash, honours
  // the identical body correctly — which is what pointed at the path.
  static get educationCreate(): string { return `/api/resume-service/education`; }
  static educationUpdate(educationId: string): string { return `/api/resume-service/education/${educationId}`; }
  static educationDelete(educationId: string): string { return `/api/resume-service/education/${educationId}`; }
  static get educationAll(): string { return `/api/resume-service/education/all`; }
  static educationById(educationId: string): string { return `/api/resume-service/education/${educationId}`; }

  // ===========================================
  // CHAT SERVICE ENDPOINTS
  // ===========================================

  // Chat Routes
  static get chatAwsSignedUploadUrl(): string { return `/api/chat-service/chat/aws-signed-upload-url`; }
  static get chatSignedUrl(): string { return `/api/chat-service/chat/get-signed-url`; }
  static get chatAssets(): string { return `/api/chat-service/chat/assets`; }

  // User Interaction Routes
  static userInteractionMute(targetUserId: string): string { return `/api/chat-service/userInteraction/mute/${targetUserId}`; }
  static userInteractionBlock(targetUserId: string): string { return `/api/chat-service/userInteraction/block/${targetUserId}`; }
  static userInteractionStatus(targetUserId: string): string { return `/api/chat-service/userInteraction/status/${targetUserId}`; }
  static get userInteractionMuted(): string { return `/api/chat-service/userInteraction/muted`; }
  static get userInteractionBlocked(): string { return `/api/chat-service/userInteraction/blocked`; }
  static userInteractionIsBlockedBy(targetUserId: string): string { return `/api/chat-service/userInteraction/is-blocked-by/${targetUserId}`; }

  // ===========================================
  // JOB SERVICE ENDPOINTS
  // ===========================================

  // Location catalog (verified Swagger 2026-07-10): GET ?q&limit. Empty q →
  // top Indian cities (limit default 20, max 50); q matches city/state/country.
  // Returned ids feed job search `locationIds` AND the chatbot's
  // LOCATION_SELECT / LOCATION_MULTI_SELECT answers.
  static get jobLocations(): string { return `/api/job-service/locations`; }

  // Job Routes
  static get jobByCompany(): string { return `/api/job-service/job/internal/by-company`; }
  static jobPublic(id: string): string { return `/api/job-service/job/public/${id}`; }
  static get jobTitles(): string { return `/api/job-service/job/job-titles`; }
  static get jobRecommended(): string { return `/api/job-service/job/recommended/get-many`; }
  static get jobApplyWithAi(): string { return `/api/job-service/job/apply-with-ai`; }
  static get jobStoreQuestionAnswer(): string { return `/api/job-service/job/store/job-question-answer`; }
  static jobAnswers(userId: string): string { return `/api/job-service/job/get-job-answers/${userId}`; }
  static get jobSearch(): string { return `/api/job-service/job/search`; }
  // External/web jobs search, JSearch-backed (verified Swagger 2026-07-14):
  // POST {q, location?, page, limit(≤10), datePosted?(default week),
  // workFromHome?} → data.jobs[] of flat external items incl. per-user
  // isSaved. Saving them goes through jobSaveToggle's {externalJob} key.
  static get jobExternalSearch(): string { return `/api/job-service/job/external/search`; }
  // Saved jobs (verified Swagger 2026-07-10):
  // toggle: POST /job/save/toggle {jobId | externalJob} → {isSaved, jobId}
  // list:   GET  /job/save/list ?page&limit → {jobs[], pagination}
  static get jobSaveToggle(): string { return `/api/job-service/job/save/toggle`; }
  static get jobSaveList(): string { return `/api/job-service/job/save/list`; }
  static get jobGenerateQuestions(): string { return `/api/job-service/job/generate-job-questions`; }
  static get jobMatch(): string { return `/api/job-service/job/match`; }
  static get jobApplyAll(): string { return `/api/job-service/job/apply-all`; }
  static get jobFiltered(): string { return `/api/job-service/job/filtered/get-jobs`; }
  static get jobMe(): string { return `/api/job-service/job/me`; }
  static get jobApplications(): string { return `/api/job-service/job/applications`; }
  static jobById(id: string): string { return `/api/job-service/job/${id}`; }
  static get jobGenerateDescription(): string { return `/api/job-service/job/generate-description`; }
  static get jobAskWithAi(): string { return `/api/job-service/job/ask-with-ai`; }
  static get jobCreate(): string { return `/api/job-service/job/create`; }
  static get jobCodeCheck(): string { return `/api/job-service/job/job-code/check`; }

  // Application Routes
  static get applicationUserAnalytics(): string { return `/api/job-service/application/user/analytics`; }
  static get applicationAppliedInterviewAnalytics(): string { return `/api/job-service/application/user/applied-interview/analytics`; }
  static get applicationPendingAll(): string { return `/api/job-service/application/pending/all`; }
  static get applicationAppliedAll(): string { return `/api/job-service/application/applied/all`; }
  static get applicationShortlistedAll(): string { return `/api/job-service/application/shortlisted/all`; }
  static get applicationRejectedAll(): string { return `/api/job-service/application/rejected/all`; }
  static applicationByJob(jobId: string): string { return `/api/job-service/application/job/${jobId}`; }
  static applicationUpdateStatus(applicationId: string): string { return `/api/job-service/application/${applicationId}/status`; }
  static applicationApply(jobId: string): string { return `/api/job-service/application/apply/${jobId}`; }

  // Company Routes (Job Service)
  static get jobCompanySearch(): string { return `/api/job-service/company/search`; }

  // ===========================================
  // INTERVIEW SERVICE ENDPOINTS
  // ===========================================

  // Job Readiness Sprint chatbot (verified Swagger 2026-07-10,
  // "updated_chat_bot_job_apply"). Flow: start {jobId} → sessionId (+ first
  // question, or PREPARING → poll the session GET) → POST answers to /messages
  // ({message} XOR {locationIds}) until isFinalAnswer/awaitingIntroMedia →
  // intro-media upload-url → S3 PUT → confirm, or skip → COMPLETED.
  // NOTE: start supersedes ANY prior in-progress sprint for the user; there is
  // no "active session" lookup, so the client must persist sessionId itself.
  static get chatbotStart(): string { return `/api/interview-service/interviews/agents/chatbot/start`; }
  static chatbotSession(sessionId: string): string { return `/api/interview-service/interviews/agents/chatbot/sessions/${sessionId}`; }
  static chatbotMessages(sessionId: string): string { return `/api/interview-service/interviews/agents/chatbot/sessions/${sessionId}/messages`; }
  static chatbotIntroMediaUploadUrl(sessionId: string): string { return `/api/interview-service/interviews/agents/chatbot/sessions/${sessionId}/intro-media/upload-url`; }
  static chatbotIntroMediaConfirm(sessionId: string): string { return `/api/interview-service/interviews/agents/chatbot/sessions/${sessionId}/intro-media/confirm`; }
  static chatbotIntroMediaSkip(sessionId: string): string { return `/api/interview-service/interviews/agents/chatbot/sessions/${sessionId}/intro-media/skip`; }

  // ===========================================
  // POST SERVICE ENDPOINTS
  // ===========================================

  // Post Routes
  static get postInternalGetAll(): string { return `/api/post-service/post/internal/get-all`; }
  static get postHello(): string { return `/api/post-service/post/`; }
  static get postGetAll(): string { return `/api/post-service/post/get-all`; }
  // Bulk-fetch full posts by id (verified Swagger 2026-07-10):
  // POST /post/bulk {postIds:[...]} → data: [ ...posts ]. Hydrates Saved Posts
  // from the user's bookmarked post ids.
  static get postBulk(): string { return `/api/post-service/post/bulk`; }
  static postGetAllByUser(userId: string): string { return `/api/post-service/post/get-all/${userId}`; }
  static get postSearch(): string { return `/api/post-service/post/search`; }
  static get postCreate(): string { return `/api/post-service/post/create`; }
  static get postAwsSignedUploadUrl(): string { return `/api/post-service/post/aws-signed-upload-url`; }

  // Interaction Routes (all verified live on staging 2026-07-03)
  // Add a reaction: POST /interaction/on/{postId}/{type} body {userId} → 201
  // (200 "already exists" if one is present).
  static interactionAdd(postId: string, type: string): string { return `/api/post-service/interaction/on/${postId}/${type}`; }
  // Change an existing reaction's type: PUT /interaction/update/on/{postId}/{type}
  // body {userId} → 200 (type is one of LIKE/LOVE/WOW/SAD/ANGRY/SMILE).
  static interactionUpdate(postId: string, type: string): string { return `/api/post-service/interaction/update/on/${postId}/${type}`; }
  // Remove the caller's reaction: DELETE /interaction/on/{postId} body {userId}
  // → 200 {deletedCount}. (Un-react now works — the older "no remove route"
  // note is stale.)
  static interactionRemove(postId: string): string { return `/api/post-service/interaction/on/${postId}`; }

  // Activity Routes
  static activityByUser(userId: string): string { return `/api/post-service/activity/user/${userId}`; }
  static activityById(activityId: string): string { return `/api/post-service/activity/${activityId}`; }
  static activityDelete(activityId: string): string { return `/api/post-service/activity/${activityId}`; }
  static activityUpdateVisibility(activityId: string): string { return `/api/post-service/activity/${activityId}/visibility`; }

  // Comment Routes
  static get commentHello(): string { return `/api/post-service/comment/`; }
  static commentReply(commentId: string): string { return `/api/post-service/comment/on/${commentId}/reply`; }
  static commentOnPost(postId: string): string { return `/api/post-service/comment/on/${postId}`; }
  static commentUpdate(commentId: string): string { return `/api/post-service/comment/update/${commentId}`; }
  static commentGetOnPost(postId: string): string { return `/api/post-service/comment/on/${postId}`; }
  static commentToggleLike(commentId: string): string { return `/api/post-service/comment/on/${commentId}/toggle/like`; }
  static commentReplies(commentId: string): string { return `/api/post-service/comment/replies/on/${commentId}`; }

  // ===========================================
  // CONNECTION SERVICE ENDPOINTS
  // ===========================================

  // Connection Routes
  static get connectionHello(): string { return `/api/connection-service/connection/`; }
  static get connectionSend(): string { return `/api/connection-service/connection/send`; }
  static get connectionWithdraw(): string { return `/api/connection-service/connection/withdraw`; }
  static get connectionUpdate(): string { return `/api/connection-service/connection/update`; }
  static connectionStatus(userId: string): string { return `/api/connection-service/connection/status/${userId}`; }
  static get connectionStatusBulk(): string { return `/api/connection-service/connection/status/bulk`; }
  static connectionCount(userId: string): string { return `/api/connection-service/connection/count/${userId}`; }
  static connectionMutuals(userId: string): string { return `/api/connection-service/connection/mutuals/${userId}`; }
  static get connectionSuggestionsMutuals(): string { return `/api/connection-service/connection/suggestions/mutuals`; }
  static get connectionIds(): string { return `/api/connection-service/connection/ids`; }
  static get connectionPending(): string { return `/api/connection-service/connection/pending`; }
  static get connectionPendingCount(): string { return `/api/connection-service/connection/pending/count`; }
  // Outgoing (sent) pending requests the current user is awaiting a response on.
  static get connectionPendingSent(): string { return `/api/connection-service/connection/pending/sent`; }
  static get connectionPendingSentCount(): string { return `/api/connection-service/connection/pending/sent/count`; }
  static get connectionAccepted(): string { return `/api/connection-service/connection/accepted`; }
  // Remove an ACCEPTED connection (verified Swagger 2026-07-10):
  // DELETE /connection/{connectionId} → also cleans up follow relationships.
  // For pending requests use withdraw (sender) / update (recipient) instead.
  static connectionDelete(connectionId: string): string { return `/api/connection-service/connection/${connectionId}`; }

  // Follow Routes
  static get followFollowerCount(): string { return `/api/connection-service/follow/follower-count`; }
  static get followStart(): string { return `/api/connection-service/follow/start`; }
  static get followStop(): string { return `/api/connection-service/follow/stop`; }
  static get followToggle(): string { return `/api/connection-service/follow/toggle`; }
  static get followStatus(): string { return `/api/connection-service/follow/status`; }
  static get followHello(): string { return `/api/connection-service/follow/`; }

  // ===========================================
  // ADMIN SERVICE ENDPOINTS
  // ===========================================

  // Admin Routes (using wildcard patterns)
  static adminAuth(path: string): string { return `/api/admin-service/auth${path}`; }
  static adminDashboard(path: string): string { return `/api/admin-service/dashboard${path}`; }
  static adminUserManagement(path: string): string { return `/api/admin-service/user-management${path}`; }
  static adminJobManagement(path: string): string { return `/api/admin-service/job-management${path}`; }
  static adminTeamManagement(path: string): string { return `/api/admin-service/team-management${path}`; }
  static adminPostManagement(path: string): string { return `/api/admin-service/post-management${path}`; }
  static adminApplicantManagement(path: string): string { return `/api/admin-service/applicant-management${path}`; }

  // ===========================================
  // API GATEWAY ENDPOINTS
  // ===========================================

  static get apiGatewayHealth(): string { return `/api/api-gateway/health`; }

  // Gateway-aggregated notifications feed
  static get notifications(): string { return `/api/notifications`; }

  // ===========================================
  // LEGACY ENDPOINTS (for backward compatibility)
  // ===========================================

  // Keep the old loginEndpoint for backward compatibility
  static get loginEndpoint(): string { return ApiConstants.authLogin; }
}
