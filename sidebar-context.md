# Left Sidebar Context (Video Editor)

This document provides an overview of the left sidebar in the CineTune video editor, focusing on its structure, logic, and the behavior of each main section (Uploads, Texts, Videos, Color Grade, Audios). This context is intended to support future changes, especially to the Uploads section.

---

## High-Level Structure

- The sidebar is implemented in `src/features/editor/menu-list.tsx`.
- It displays a vertical toolbar with buttons for each main section:
  - Uploads (with A-Roll and B-Roll subsections)
  - Texts
  - Videos
  - Color Grade (Images)
  - Audios
- Clicking a button sets the active menu item and shows the corresponding panel (either in a sidebar or a drawer on mobile).
- The content for each section is rendered by the `MenuItem` component, which delegates to a specific component for each menu item.

---

## Menu Items & Their Components

| Section      | Menu ID   | Component File                                      |
|--------------|-----------|-----------------------------------------------------|
| Uploads      | uploads   | `menu-item/uploads.tsx`                             |
| Texts        | texts     | `menu-item/texts.tsx`                               |
| Videos       | videos    | `menu-item/videos.tsx`                              |
| Color Grade  | images    | `menu-item/images.tsx`                              |
| Audios       | audios    | `menu-item/audios.tsx`                              |

---

## Section-by-Section Breakdown

### 1. **Uploads**
- **Purpose:** Manage user-uploaded videos, images, and audios. Allows adding these assets to the timeline with A-Roll and B-Roll organization.
- **Key Features:**
  - **A-Roll/B-Roll Sections:** Videos are organized into two distinct categories:
    - **A-Rolls / Main Video:** Primary content videos (marked with blue badge and crown icon)
    - **B-Rolls:** Secondary/supplementary videos (marked with green badge and layers icon)
  - **Upload Functionality:** 
    - Clickable section headers trigger upload modals for respective video types
    - Empty sections show "+" add icons to prompt uploads
    - Each upload is tagged with `aRollType` ('a-roll' or 'b-roll') and `userId`
  - **Thumbnail Display:** 
    - Shows video thumbnails for uploaded content
    - Fallback to video icon if thumbnail generation fails
    - Hover effects reveal play overlay
  - **Visual Differentiation:**
    - A-Roll videos: Blue badge with crown icon (A)
    - B-Roll videos: Green badge with layers icon (B)
  - **Progress Tracking:** Shows uploads in progress with status and progress indicators
  - **Google Drive Integration:** All uploads include enhanced metadata for proper cloud organization
- **Component:** `menu-item/uploads.tsx`
- **State Management:** Uses `useUploadStore` for uploads and modal state management
- **UI Elements:**
  - Clickable section headers for A-Roll and B-Roll
  - Add icons for empty sections
  - Thumbnail grids with visual badges
  - Progress indicators for ongoing uploads

### 2. **Texts**
- **Purpose:** Add and manage text elements and captions on the timeline.
- **Key Features:**
  - Add plain text to the timeline (draggable or button click)
  - Add creative captions (auto-generated from video via backend API)
  - Load captions from JSON (previously generated)
  - Configure caption region and words-at-a-time for creative captions
  - Transcript view for available captions
- **Component:** `menu-item/texts.tsx`
- **State Management:** Uses local state and `useStore` for timeline data.
- **UI Elements:**
  - Add text button (draggable)
  - Add creative captions button
  - Load captions from JSON button
  - Dropdowns for region and words-at-a-time
  - Transcript toggle and display

### 3. **Videos**
- **Purpose:** Video section placeholder (Pexels integration removed).
- **Key Features:**
  - Simple placeholder message
  - Maintains menu structure
- **Component:** `menu-item/videos.tsx`
- **State Management:** None (simplified)
- **UI Elements:**
  - Basic placeholder text

### 4. **Color Grade (Images)**
- **Purpose:** Apply cinematic color grading (LUTs) to videos in the timeline.
- **Key Features:**
  - Detects video in timeline
  - Sends video to backend for LUT preview generation
  - Displays preview frames for each LUT
  - Clicking a preview applies the LUT to the video (replaces video in timeline)
- **Component:** `menu-item/images.tsx`
- **State Management:** Uses `useStore` for timeline data
- **UI Elements:**
  - Cinematic grading button
  - Grid of LUT preview frames (clickable)

### 5. **Audios**
- **Purpose:** Browse and add stock audio tracks to the timeline.
- **Key Features:**
  - Lists available audio tracks (from static data)
  - Add audio to timeline by clicking or dragging
- **Component:** `menu-item/audios.tsx`
- **State Management:** Uses static data and `useIsDraggingOverTimeline`
- **UI Elements:**
  - Scrollable list of audio tracks with preview and metadata

---

## A-Roll/B-Roll Upload System

The uploads section features a sophisticated A-Roll and B-Roll organization system for better video content management.

### Architecture Overview

The A-Roll/B-Roll system enhances the existing upload architecture with content categorization:

```
Frontend → A-Roll/B-Roll Tagging → Next.js API Routes → External GCP Service → Google Cloud Storage
```

### A-Roll vs B-Roll Organization

#### **A-Rolls / Main Video**
- **Purpose:** Primary content, main narrative videos
- **Visual Indicator:** Blue badge with crown icon (A)
- **Use Case:** Main talking head videos, primary content, hero videos
- **Metadata Tag:** `aRollType: 'a-roll'`

#### **B-Rolls**  
- **Purpose:** Secondary content, supplementary footage
- **Visual Indicator:** Green badge with layers icon (B)
- **Use Case:** Background footage, cutaways, supporting visuals
- **Metadata Tag:** `aRollType: 'b-roll'`

### Enhanced Upload Flow

#### 1. **Upload Initiation**
1. **Section Selection:** User clicks A-Roll or B-Roll section header
2. **Modal Opening:** Upload modal opens with correct `aRollType` parameter
3. **File Selection:** Standard file selection via drag-and-drop or file picker
4. **Thumbnail Generation:** Video thumbnails are extracted during upload process

#### 2. **Metadata Enhancement**
- **User Identification:** Each upload tagged with `userId` for multi-user support
- **Type Classification:** `aRollType` field distinguishes A-Roll from B-Roll
- **Thumbnail Storage:** Video thumbnails stored as base64 data URLs
- **Timestamp:** Upload time recorded for organization
- **File Information:** Original filename preserved for reference

#### 3. **Upload Processing & Thumbnail Preservation**
- **Backend Upload:** Files uploaded to Google Drive with enhanced metadata
- **Metadata Merging:** Original thumbnail and A-Roll/B-Roll data preserved during upload completion
- **Automatic Thumbnail Generation:** Videos without thumbnails (URL uploads) get thumbnails generated post-upload
- **Thumbnail Fallback:** If thumbnail generation fails, displays video icon placeholder

#### 4. **Display & Recognition**
- **Thumbnail Display:** Shows actual video thumbnails instead of generic icons
- **Visual Badges:** Clear A/B indicators for instant recognition
- **Hover Effects:** Play overlay appears on thumbnail hover
- **Organized Sections:** Separate grids for A-Roll and B-Roll content
- **Session Persistence:** Thumbnails and metadata persist across user sessions

### Upload Data Structure (Enhanced)

```typescript
interface UploadFile {
  id: string;
  file?: File;
  url?: string;
  type?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  progress?: number;
  error?: string;
  aRollType?: 'a-roll' | 'b-roll';  // NEW: Content classification
  userId?: string;                   // NEW: User identification
  metadata: {
    aRollType?: 'a-roll' | 'b-roll';
    userId?: string;
    uploadedAt?: string;
    thumbnailUrl?: string;           // NEW: Video thumbnail
    fileName?: string;               // NEW: Original filename
    localUrl?: string;               // Local processing URL
    uploadedUrl?: string;            // Final storage URL
  };
}
```

### Timeline Integration

When videos are added to the timeline from A-Roll or B-Roll sections:

- **Metadata Preservation:** A-Roll/B-Roll type is preserved in timeline metadata
- **User Tracking:** User ID maintains ownership information
- **Thumbnail Reference:** Thumbnail URLs are available for timeline preview
- **Source Identification:** Videos can be traced back to their A-Roll/B-Roll origin

---

## Google Drive / Cloud Storage Upload Logic

The uploads section integrates with an external Google Cloud Platform (GCP) service for file storage and management. This provides scalable, secure cloud storage for user uploads with enhanced A-Roll/B-Roll organization.

### Architecture Overview

The upload system uses a **proxy pattern** where the Next.js app acts as a middleman between the frontend and an external GCP-based upload service:

```
Frontend → A-Roll/B-Roll Tagging → Next.js API Routes → External GCP Service → Google Cloud Storage
```

### External Upload Service

- **Service URL:** `https://upload-file-j43uyuaeza-uc.a.run.app`
- **Platform:** Google Cloud Run (serverless)
- **Purpose:** Handles presigned URL generation and file upload processing with A-Roll/B-Roll metadata
- **Endpoints:**
  - `/presigned` - Generate presigned URLs for direct file uploads
  - `/url` - Process URL-based uploads (e.g., from external links)

### Enhanced Upload Flow

#### 1. **File Upload Flow (A-Roll/B-Roll)**
1. **Section Selection:** User selects A-Roll or B-Roll section for upload
2. **File Selection:** User selects files via drag-and-drop or file picker in `ModalUpload`
3. **Thumbnail Generation:** Video thumbnails extracted using canvas API
4. **Metadata Enhancement:** Files tagged with `aRollType`, `userId`, and thumbnail data
5. **Presigned URL Request:** Frontend calls `/api/uploads/presign` with enhanced metadata
6. **External Service Call:** Next.js proxies request to GCP service at `/presigned`
7. **Presigned URL Response:** GCP service returns presigned URLs for direct storage upload
8. **Direct Upload:** Frontend uploads files directly to Google Cloud Storage using presigned URLs
9. **Progress Tracking:** Upload progress tracked and displayed with A-Roll/B-Roll indicators
10. **Completion:** Upload data stored with full metadata and assets appear in correct section

#### 2. **URL Upload Flow (A-Roll/B-Roll)**
1. **Section Selection:** User selects A-Roll or B-Roll for URL upload
2. **URL Input:** User provides external URL (e.g., video from another site)
3. **Metadata Tagging:** URL tagged with `aRollType` and `userId`
4. **URL Processing:** Frontend calls `/api/uploads/url` with enhanced metadata
5. **External Service Call:** Next.js proxies request to GCP service at `/url`
6. **File Download & Upload:** GCP service downloads from URL and uploads to storage
7. **Completion:** Processed file data returned with A-Roll/B-Roll classification

### Key Components (Enhanced)

#### **API Routes**
- **`/api/uploads/presign`** - Generates presigned URLs with A-Roll/B-Roll metadata
- **`/api/uploads/url`** - Processes URL uploads with content classification
- **`/api/uploads/verify-local`** - Verifies local file existence for development

#### **Upload Service** (`src/utils/upload-service.ts`)
- **`processFileUpload()`** - Handles direct file upload with A-Roll/B-Roll progress tracking
- **`processUrlUpload()`** - Handles URL-based upload with content classification
- **`processUpload()`** - Main upload dispatcher with enhanced metadata support

#### **Upload Store** (`src/features/editor/store/use-upload-store.ts`)
- **State Management:** Manages pending, active, and completed uploads with A-Roll/B-Roll organization
- **Progress Tracking:** Tracks upload progress with visual type indicators
- **Queue Processing:** Processes upload queue with A-Roll/B-Roll metadata preservation
- **Thumbnail Preservation:** Preserves thumbnails and metadata from modal through upload completion
- **Automatic Thumbnail Generation:** Generates thumbnails for videos that don't have them (URL uploads)
- **Metadata Merging:** Combines backend upload data with original A-Roll/B-Roll metadata

#### **Upload Modal** (`src/components/modal-upload.tsx`)
- **Type-Aware Selection:** Accepts `aRollType` parameter for content classification
- **Thumbnail Generation:** Creates and stores video thumbnails during upload
- **Enhanced Metadata:** Adds user ID, type classification, and thumbnail data
- **Upload Initiation:** Triggers upload process with full metadata enhancement

### Upload States (Enhanced)

| State      | Description                                          | A-Roll/B-Roll Support |
|------------|------------------------------------------------------|----------------------|
| `pending`  | File selected but not yet started uploading         | ✅ Type preserved     |
| `uploading`| Upload in progress with progress percentage          | ✅ Visual indicators  |
| `uploaded` | Successfully uploaded and available in storage      | ✅ Organized by type  |
| `failed`   | Upload failed with error message                    | ✅ Error with context |

### Security Features (Enhanced)

- **Presigned URLs:** Secure, time-limited URLs for direct cloud storage access
- **User Isolation:** Each user has isolated storage with `userId` parameter and A-Roll/B-Roll organization
- **Content Type Validation:** File types validated with additional A-Roll/B-Roll context
- **Error Handling:** Comprehensive error handling with A-Roll/B-Roll context preservation

### Development Support (Enhanced)

- **Local File Verification:** `/api/uploads/verify-local` route supports A-Roll/B-Roll testing
- **Local Storage Fallback:** Files stored locally with type classification during development
- **Progress Simulation:** Mock progress updates for testing A-Roll/B-Roll upload UI
- **Thumbnail Testing:** Local thumbnail generation for development testing

---

## Key Behaviors & Interactions

- **Active State:** Only one section is active at a time; its panel is shown.
- **A-Roll/B-Roll Management:** 
  - Separate upload flows for different content types
  - Visual differentiation with colored badges and icons
  - Thumbnail-based content preview
  - Click-to-upload functionality for empty sections
- **Responsiveness:**
  - On large screens, the sidebar is always visible with A-Roll/B-Roll sections.
  - On mobile/tablet, the sidebar opens as a drawer with preserved functionality.
- **Drag-and-Drop:** Many items (text, video, audio) can be dragged onto the timeline with metadata preservation.
- **State Management:**
  - Uses various stores/hooks for uploads, timeline, and layout state.
  - Enhanced upload store supports A-Roll/B-Roll organization.
- **Extensibility:**
  - New sections can be added by updating the `MENU_ITEMS` array and providing a corresponding component.
  - A-Roll/B-Roll system can be extended to other content types.

---

## Example: Enhanced Uploads Section Logic

- **A-Roll Section:**
  - Clickable header opens A-Roll upload modal
  - Empty state shows "+" add icon
  - Uploaded videos display with blue badge and crown icon
  - Thumbnails show actual video content
  - Clicking thumbnails adds videos to timeline with A-Roll metadata
  
- **B-Roll Section:**
  - Clickable header opens B-Roll upload modal  
  - Empty state shows "+" add icon
  - Uploaded videos display with green badge and layers icon
  - Thumbnails show actual video content
  - Clicking thumbnails adds videos to timeline with B-Roll metadata

- **Upload Process:**
  - Modal accepts `aRollType` and `userId` parameters
  - Thumbnail generation during file selection
  - Enhanced metadata preserved through entire upload flow
  - Progress tracking with type-specific visual indicators
  - **Thumbnail Preservation:** Thumbnails generated in modal are preserved through backend upload
  - **Post-Upload Thumbnail Generation:** Videos without thumbnails (URL uploads) get thumbnails generated automatically
  - **Cross-Session Persistence:** Thumbnails and A-Roll/B-Roll organization persist across user sessions

- **State Management:**
  - `uploads`, `pendingUploads`, `activeUploads` from `useUploadStore`
  - A-Roll/B-Roll filtering and organization
  - Modal state management with type awareness
  - Thumbnail and metadata preservation

---

## References
- Sidebar menu: `src/features/editor/menu-list.tsx`
- Menu item switcher: `src/features/editor/menu-item/menu-item.tsx`
- Section components:
  - **Uploads (Enhanced):** `src/features/editor/menu-item/uploads.tsx`
  - Texts: `src/features/editor/menu-item/texts.tsx`
  - Videos: `src/features/editor/menu-item/videos.tsx`
  - Color Grade: `src/features/editor/menu-item/images.tsx`
  - Audios: `src/features/editor/menu-item/audios.tsx`
- Upload system (Enhanced):
  - Upload service: `src/utils/upload-service.ts`
  - **Upload store (Enhanced):** `src/features/editor/store/use-upload-store.ts`
  - **Upload modal (Enhanced):** `src/components/modal-upload.tsx`
  - API routes: `src/app/api/uploads/`

---

*This file is intended as a reference for understanding and modifying the sidebar, especially the enhanced A-Roll/B-Roll upload system with thumbnail support and visual differentiation.* 