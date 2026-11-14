import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Animation, StatusBar } from '@capacitor/status-bar';

export type HapticCueKind =
  | 'combat_hit'
  | 'combat_heavy'
  | 'combat_armor_break'
  | 'shaman_fuse'
  | 'shaman_unfuse'
  | 'fishing_bite'
  | 'fishing_catch';

export interface HapticDispatchRecord {
  kind: HapticCueKind;
  timestamp: number;
  platform: string;
  nativeDispatched: boolean;
}

export interface MobileShellStatus {
  orientationLocked: boolean;
  statusBarHidden: boolean;
  platform: string;
  isNative: boolean;
}

const MAX_HAPTIC_HISTORY = 40;
const hapticHistory: HapticDispatchRecord[] = [];
const hapticListeners = new Set<(record: HapticDispatchRecord) => void>();

let lastShellStatus: MobileShellStatus = {
  orientationLocked: false,
  statusBarHidden: false,
  platform: 'web',
  isNative: false,
};

function recordHaptic(kind: HapticCueKind, nativeDispatched: boolean): HapticDispatchRecord {
  const entry: HapticDispatchRecord = {
    kind,
    timestamp: Date.now(),
    platform: Capacitor.getPlatform(),
    nativeDispatched,
  };
  hapticHistory.push(entry);
  if (hapticHistory.length > MAX_HAPTIC_HISTORY) {
    hapticHistory.shift();
  }
  for (const listener of hapticListeners) {
    listener(entry);
  }
  return entry;
}

export function getHapticHistory(): HapticDispatchRecord[] {
  return [...hapticHistory];
}

export function clearHapticHistory(): void {
  hapticHistory.length = 0;
}

export function subscribeHapticEvents(
  listener: (record: HapticDispatchRecord) => void,
): () => void {
  hapticListeners.add(listener);
  return () => hapticListeners.delete(listener);
}

export function getMobileShellStatus(): MobileShellStatus {
  return { ...lastShellStatus };
}

function tryWebVibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore blocked vibration before user gesture
    }
  }
}

/**
 * Enforces landscape orientation lock and hides the native iOS/Android status bar
 * at application startup, falling back gracefully on desktop/mobile web browsers.
 */
export async function initializeMobileDeviceShell(): Promise<MobileShellStatus> {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  let orientationLocked = false;
  let statusBarHidden = false;

  if (isNative) {
    try {
      await ScreenOrientation.lock({ orientation: 'landscape' });
      orientationLocked = true;
    } catch {
      orientationLocked = false;
    }

    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.hide({ animation: Animation.None });
      statusBarHidden = true;
    } catch {
      statusBarHidden = false;
    }
  } else if (typeof screen !== 'undefined') {
    const orient = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape') => Promise<void>;
    };
    if (orient && typeof orient.lock === 'function') {
      try {
        await orient.lock('landscape');
        orientationLocked = true;
      } catch {
        orientationLocked = false;
      }
    }
  }

  lastShellStatus = {
    orientationLocked,
    statusBarHidden,
    platform,
    isNative,
  };
  return { ...lastShellStatus };
}

/**
 * Triggers tactile haptic feedback for combat hits, critical strikes, and Armor Break.
 */
export async function triggerCombatHitHaptic(options?: {
  heavy?: boolean;
  armorBreak?: boolean;
}): Promise<HapticDispatchRecord> {
  const isNative = Capacitor.isNativePlatform();
  const kind: HapticCueKind = options?.armorBreak
    ? 'combat_armor_break'
    : options?.heavy
      ? 'combat_heavy'
      : 'combat_hit';

  if (isNative) {
    try {
      if (options?.armorBreak) {
        await Haptics.notification({ type: NotificationType.Warning });
      } else {
        await Haptics.impact({
          style: options?.heavy ? ImpactStyle.Heavy : ImpactStyle.Medium,
        });
      }
      return recordHaptic(kind, true);
    } catch {
      // Fall through to web vibrate fallback
    }
  }

  tryWebVibrate(options?.armorBreak ? [35, 30, 55] : options?.heavy ? 45 : 24);
  return recordHaptic(kind, false);
}

/**
 * Triggers tactile haptic feedback when binding or unbinding a Shaman via fusion.
 */
export async function triggerShamanFusionHaptic(
  isBinding: boolean,
): Promise<HapticDispatchRecord> {
  const isNative = Capacitor.isNativePlatform();
  const kind: HapticCueKind = isBinding ? 'shaman_fuse' : 'shaman_unfuse';

  if (isNative) {
    try {
      if (isBinding) {
        await Haptics.notification({ type: NotificationType.Success });
      } else {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
      return recordHaptic(kind, true);
    } catch {
      // Fall through to web vibrate fallback
    }
  }

  tryWebVibrate(isBinding ? [22, 24, 38] : 14);
  return recordHaptic(kind, false);
}

/**
 * Triggers tactile haptic feedback on Manillo fishing bites and successful catches.
 */
export async function triggerFishingBiteHaptic(
  stage: 'bite' | 'catch',
  isRareCatch = false,
): Promise<HapticDispatchRecord> {
  const isNative = Capacitor.isNativePlatform();
  const kind: HapticCueKind = stage === 'bite' ? 'fishing_bite' : 'fishing_catch';

  if (isNative) {
    try {
      if (stage === 'bite') {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (isRareCatch) {
        await Haptics.notification({ type: NotificationType.Success });
      } else {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      }
      return recordHaptic(kind, true);
    } catch {
      // Fall through to web vibrate fallback
    }
  }

  tryWebVibrate(stage === 'bite' ? [18, 22, 18] : isRareCatch ? [28, 30, 50] : 34);
  return recordHaptic(kind, false);
}
