/**
 * Enhanced Debug Logger for CineTune Render System
 * Provides comprehensive browser and system information for debugging render errors
 */

export interface DebugInfo {
  timestamp: string;
  browser: {
    userAgent: string;
    vendor: string;
    version: string;
    language: string;
    platform: string;
    cookieEnabled: boolean;
    doNotTrack: string | null;
    hardwareConcurrency: number;
    maxTouchPoints: number;
    onLine: boolean;
  };
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
    screenWidth: number;
    screenHeight: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
  };
  location: {
    href: string;
    origin: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
  };
  performance: {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
    timing?: PerformanceTiming;
    navigation?: PerformanceNavigation;
  };
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  };
  storage: {
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
  };
  features: {
    webGL: boolean;
    webGL2: boolean;
    webAssembly: boolean;
    serviceWorker: boolean;
    pushManager: boolean;
    notifications: boolean;
    geolocation: boolean;
    vibrate: boolean;
    battery: boolean;
  };
  media: {
    mediaDevices: boolean;
    webRTC: boolean;
    audioContext: boolean;
    videoCodecs: string[];
    audioCodecs: string[];
  };
}

class DebugLogger {
  private static instance: DebugLogger;
  private sessionId: string;
  private startTime: number;

  private constructor() {
    this.sessionId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
  }

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  public getSystemInfo(): DebugInfo {
    const nav = navigator as any;
    const perf = performance as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    return {
      timestamp: new Date().toISOString(),
      browser: {
        userAgent: nav.userAgent || 'Unknown',
        vendor: nav.vendor || 'Unknown',
        version: this.getBrowserVersion(),
        language: nav.language || 'Unknown',
        platform: nav.platform || 'Unknown',
        cookieEnabled: nav.cookieEnabled || false,
        doNotTrack: nav.doNotTrack || null,
        hardwareConcurrency: nav.hardwareConcurrency || 0,
        maxTouchPoints: nav.maxTouchPoints || 0,
        onLine: nav.onLine || false,
      },
      viewport: {
        width: window.innerWidth || 0,
        height: window.innerHeight || 0,
        devicePixelRatio: window.devicePixelRatio || 1,
        screenWidth: screen.width || 0,
        screenHeight: screen.height || 0,
        availWidth: screen.availWidth || 0,
        availHeight: screen.availHeight || 0,
        colorDepth: screen.colorDepth || 0,
        pixelDepth: screen.pixelDepth || 0,
      },
      location: {
        href: window.location.href,
        origin: window.location.origin,
        protocol: window.location.protocol,
        host: window.location.host,
        hostname: window.location.hostname,
        port: window.location.port,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      },
      performance: {
        memory: perf.memory ? {
          usedJSHeapSize: perf.memory.usedJSHeapSize,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
        } : undefined,
        timing: perf.timing,
        navigation: perf.navigation,
      },
      connection: connection ? {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
      } : undefined,
      storage: {
        localStorage: this.testStorage('localStorage'),
        sessionStorage: this.testStorage('sessionStorage'),
        indexedDB: typeof indexedDB !== 'undefined',
      },
      features: {
        webGL: this.testWebGL(),
        webGL2: this.testWebGL2(),
        webAssembly: typeof WebAssembly !== 'undefined',
        serviceWorker: 'serviceWorker' in nav,
        pushManager: 'PushManager' in window,
        notifications: 'Notification' in window,
        geolocation: 'geolocation' in nav,
        vibrate: 'vibrate' in nav,
        battery: 'getBattery' in nav,
      },
      media: {
        mediaDevices: 'mediaDevices' in nav,
        webRTC: this.testWebRTC(),
        audioContext: this.testAudioContext(),
        videoCodecs: this.getSupportedVideoCodecs(),
        audioCodecs: this.getSupportedAudioCodecs(),
      },
    };
  }

  private getBrowserVersion(): string {
    const ua = navigator.userAgent;
    let version = 'Unknown';

    if (ua.indexOf('Chrome') > -1) {
      const match = ua.match(/Chrome\/([0-9.]+)/);
      version = match ? `Chrome ${match[1]}` : 'Chrome Unknown';
    } else if (ua.indexOf('Firefox') > -1) {
      const match = ua.match(/Firefox\/([0-9.]+)/);
      version = match ? `Firefox ${match[1]}` : 'Firefox Unknown';
    } else if (ua.indexOf('Safari') > -1) {
      const match = ua.match(/Version\/([0-9.]+)/);
      version = match ? `Safari ${match[1]}` : 'Safari Unknown';
    } else if (ua.indexOf('Edge') > -1) {
      const match = ua.match(/Edge\/([0-9.]+)/);
      version = match ? `Edge ${match[1]}` : 'Edge Unknown';
    }

    return version;
  }

  private testStorage(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private testWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private testWebGL2(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch {
      return false;
    }
  }

  private testWebRTC(): boolean {
    return !!(
      (window as any).RTCPeerConnection ||
      (window as any).mozRTCPeerConnection ||
      (window as any).webkitRTCPeerConnection
    );
  }

  private testAudioContext(): boolean {
    return !!(
      (window as any).AudioContext ||
      (window as any).webkitAudioContext ||
      (window as any).mozAudioContext
    );
  }

  private getSupportedVideoCodecs(): string[] {
    const video = document.createElement('video');
    const codecs = [
      'video/mp4; codecs="avc1.42E01E"', // H.264 Baseline
      'video/mp4; codecs="avc1.64001E"', // H.264 High
      'video/mp4; codecs="hev1.1.6.L93.90"', // H.265
      'video/webm; codecs="vp8"', // VP8
      'video/webm; codecs="vp9"', // VP9
      'video/webm; codecs="av01.0.04M.08"', // AV1
    ];

    return codecs.filter(codec => {
      try {
        return video.canPlayType(codec) !== '';
      } catch {
        return false;
      }
    });
  }

  private getSupportedAudioCodecs(): string[] {
    const audio = document.createElement('audio');
    const codecs = [
      'audio/mpeg', // MP3
      'audio/ogg; codecs="vorbis"', // Ogg Vorbis
      'audio/mp4; codecs="mp4a.40.2"', // AAC
      'audio/webm; codecs="opus"', // Opus
      'audio/wav', // WAV
    ];

    return codecs.filter(codec => {
      try {
        return audio.canPlayType(codec) !== '';
      } catch {
        return false;
      }
    });
  }

  public logRenderStart(payload: any): void {
    const systemInfo = this.getSystemInfo();
    
    console.group('🚀 [CineTune Debug] COMPREHENSIVE RENDER DEBUG INFO');
    
    console.group('🎯 Render Session');
    console.log('Session ID:', this.sessionId);
    console.log('Start Time:', new Date(this.startTime).toISOString());
    console.log('Elapsed Since Page Load:', (Date.now() - this.startTime) / 1000, 'seconds');
    console.groupEnd();

    console.group('🌐 Browser Environment');
    console.log('User Agent:', systemInfo.browser.userAgent);
    console.log('Browser Version:', systemInfo.browser.version);
    console.log('Platform:', systemInfo.browser.platform);
    console.log('Language:', systemInfo.browser.language);
    console.log('Hardware Concurrency:', systemInfo.browser.hardwareConcurrency, 'cores');
    console.log('Online Status:', systemInfo.browser.onLine);
    console.groupEnd();

    console.group('📱 Viewport & Display');
    console.log('Viewport:', `${systemInfo.viewport.width}x${systemInfo.viewport.height}`);
    console.log('Screen:', `${systemInfo.viewport.screenWidth}x${systemInfo.viewport.screenHeight}`);
    console.log('Device Pixel Ratio:', systemInfo.viewport.devicePixelRatio);
    console.log('Color Depth:', systemInfo.viewport.colorDepth, 'bits');
    console.groupEnd();

    if (systemInfo.performance.memory) {
      console.group('💾 Memory Usage');
      const memory = systemInfo.performance.memory;
      console.log('Used JS Heap:', (memory.usedJSHeapSize / 1024 / 1024).toFixed(2), 'MB');
      console.log('Total JS Heap:', (memory.totalJSHeapSize / 1024 / 1024).toFixed(2), 'MB');
      console.log('JS Heap Limit:', (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2), 'MB');
      console.log('Memory Usage:', ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1), '%');
      console.groupEnd();
    }

    if (systemInfo.connection) {
      console.group('🌐 Network Connection');
      console.log('Connection Type:', systemInfo.connection.effectiveType);
      console.log('Downlink Speed:', systemInfo.connection.downlink, 'Mbps');
      console.log('Round Trip Time:', systemInfo.connection.rtt, 'ms');
      console.log('Save Data Mode:', systemInfo.connection.saveData);
      console.groupEnd();
    }

    console.group('🎥 Media Capabilities');
    console.log('Supported Video Codecs:', systemInfo.media.videoCodecs);
    console.log('Supported Audio Codecs:', systemInfo.media.audioCodecs);
    console.log('WebGL Support:', systemInfo.features.webGL);
    console.log('WebGL2 Support:', systemInfo.features.webGL2);
    console.log('Audio Context:', systemInfo.media.audioContext);
    console.log('WebRTC Support:', systemInfo.media.webRTC);
    console.groupEnd();

    console.group('🔧 Browser Features');
    console.log('Service Worker:', systemInfo.features.serviceWorker);
    console.log('Web Assembly:', systemInfo.features.webAssembly);
    console.log('Local Storage:', systemInfo.storage.localStorage);
    console.log('Session Storage:', systemInfo.storage.sessionStorage);
    console.log('IndexedDB:', systemInfo.storage.indexedDB);
    console.groupEnd();

    console.group('📋 Render Payload Analysis');
    if (payload) {
      console.log('Payload ID:', payload.id);
      console.log('Video Dimensions:', payload.size ? `${payload.size.width}x${payload.size.height}` : 'Not specified');
      console.log('FPS:', payload.fps || 'Default (30)');
      console.log('Duration:', payload.duration ? `${payload.duration}ms (${(payload.duration/1000).toFixed(2)}s)` : 'Not specified');
      
      const trackItems = Array.isArray(payload.trackItems) ? payload.trackItems : [];
      console.log('Track Items Count:', trackItems.length);
      
      if (trackItems.length > 0) {
        const itemTypes = trackItems.reduce((acc: any, item: any) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {});
        console.log('Track Item Types:', itemTypes);
        
        // Analyze media sources
        const videoItems = trackItems.filter((item: any) => item.type === 'video');
        const audioItems = trackItems.filter((item: any) => item.type === 'audio');
        
        if (videoItems.length > 0) {
          console.group('🎬 Video Assets');
          videoItems.forEach((video: any, index: number) => {
            const src = video.details?.src || 'No source';
            const isUrl = src.startsWith('http');
            const isBlob = src.startsWith('blob:');
            const isDataUrl = src.startsWith('data:');
            
            console.log(`Video ${index + 1}:`, {
              id: video.id,
              source: src.substring(0, 100) + (src.length > 100 ? '...' : ''),
              type: isUrl ? 'URL' : isBlob ? 'Blob' : isDataUrl ? 'Data URL' : 'Unknown',
              duration: video.display ? `${video.display.to - video.display.from}ms` : 'Unknown',
              hasLocalUrl: !!video.metadata?.localUrl,
              hasExternalUrl: !!video.metadata?.externalUrl,
              filename: video.metadata?.fileName || 'Unknown',
            });
          });
          console.groupEnd();
        }
        
        if (audioItems.length > 0) {
          console.group('🎵 Audio Assets');
          audioItems.forEach((audio: any, index: number) => {
            console.log(`Audio ${index + 1}:`, {
              id: audio.id,
              source: (audio.details?.src || 'No source').substring(0, 100),
              duration: audio.display ? `${audio.display.to - audio.display.from}ms` : 'Unknown',
            });
          });
          console.groupEnd();
        }
      }
      
      if (payload.background) {
        console.log('Background:', payload.background);
      }
    } else {
      console.error('❌ No payload provided!');
    }
    console.groupEnd();

    console.groupEnd();
  }

  public logError(error: any, context: string = 'Unknown'): void {
    const systemInfo = this.getSystemInfo();
    
    console.group('💥 [CineTune Debug] DETAILED ERROR ANALYSIS');
    
    console.group('⚠️ Error Information');
    console.error('Context:', context);
    console.error('Error Type:', typeof error);
    console.error('Error Name:', error?.name || 'Unknown');
    console.error('Error Message:', error?.message || String(error));
    console.error('Error Stack:', error?.stack || 'No stack trace');
    console.error('Timestamp:', new Date().toISOString());
    console.groupEnd();

    console.group('🌍 Environment at Error Time');
    console.log('Online Status:', navigator.onLine);
    console.log('Current URL:', window.location.href);
    console.log('Viewport:', `${window.innerWidth}x${window.innerHeight}`);
    
    if (systemInfo.performance.memory) {
      const memory = systemInfo.performance.memory;
      console.log('Memory Usage:', {
        used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB',
        percentage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1) + '%',
      });
    }
    console.groupEnd();

    console.group('🔍 Error Classification');
    const errorString = String(error).toLowerCase();
    const errorMessage = error?.message?.toLowerCase() || '';
    
    if (errorString.includes('network') || errorString.includes('fetch') || errorString.includes('cors')) {
      console.error('🌐 NETWORK ERROR - Check connectivity and CORS settings');
    } else if (errorString.includes('timeout') || errorMessage.includes('timeout')) {
      console.error('⏰ TIMEOUT ERROR - Operation took too long');
    } else if (errorString.includes('memory') || errorString.includes('heap')) {
      console.error('💾 MEMORY ERROR - Insufficient memory available');
    } else if (errorString.includes('permission') || errorString.includes('denied')) {
      console.error('🔒 PERMISSION ERROR - Access denied');
    } else if (errorString.includes('syntax') || error instanceof SyntaxError) {
      console.error('📝 SYNTAX ERROR - Malformed data or code');
    } else if (errorString.includes('type') || error instanceof TypeError) {
      console.error('🏷️ TYPE ERROR - Incorrect data type or null/undefined access');
    } else if (errorString.includes('reference') || error instanceof ReferenceError) {
      console.error('🔗 REFERENCE ERROR - Variable or function not found');
    } else {
      console.error('❓ UNKNOWN ERROR TYPE - Check error details above');
    }
    console.groupEnd();

    console.groupEnd();
  }

  public logPerformanceMetrics(): void {
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function' && typeof performance.measure === 'function') {
      const marks = performance.getEntriesByType('mark');
      const measures = performance.getEntriesByType('measure');
      
      if (marks.length > 0 || measures.length > 0) {
        console.group('⚡ [CineTune Debug] PERFORMANCE METRICS');
        
        if (marks.length > 0) {
          console.log('Performance Marks:', marks);
        }
        
        if (measures.length > 0) {
          console.log('Performance Measures:', measures);
        }
        
        console.groupEnd();
      }
    }
  }
}

export const debugLogger = DebugLogger.getInstance();