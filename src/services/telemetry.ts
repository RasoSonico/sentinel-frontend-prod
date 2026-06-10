import { ApplicationInsights } from "@microsoft/applicationinsights-web";
import { ITelemetryItem } from "@microsoft/applicationinsights-core-js";

const INSTRUMENTATION_KEY = process.env.EXPO_PUBLIC_APPINSIGHTS_KEY ?? "";

const TAG = "[Telemetry]";
// __DEV__ is a React Native global: true in dev/Expo Go, false in production builds.
// Bundlers strip the dead branch entirely, so no logging overhead in prod.
const log = (...args: unknown[]) => { if (__DEV__) console.log(...args); };

type QueuedEvent =
  | { type: "screen"; name: string; properties?: Record<string, string> }
  | { type: "event"; name: string; properties?: Record<string, string | number | boolean> }
  | { type: "error"; error: Error; properties?: Record<string, string> };

class TelemetryService {
  private client: ApplicationInsights | null = null;
  private initialized = false;
  private queue: QueuedEvent[] = [];

  init(userId: string, role: string) {
    if (this.initialized) return;

    const keyStatus = INSTRUMENTATION_KEY
      ? `key found (${INSTRUMENTATION_KEY.slice(0, 8)}...)`
      : "⚠️  NO KEY — EXPO_PUBLIC_APPINSIGHTS_KEY not set";

    log(`${TAG} init — userId=${userId} role=${role} ${keyStatus}`);

    this.client = new ApplicationInsights({
      config: {
        instrumentationKey: INSTRUMENTATION_KEY,
        disableAjaxTracking: false,
        disableFetchTracking: false,
        enableAutoRouteTracking: false,
      },
    });

    this.client.loadAppInsights();
    this.client.setAuthenticatedUserContext(userId);
    this.client.addTelemetryInitializer((envelope: ITelemetryItem) => {
      envelope.data = { ...envelope.data, role, env: __DEV__ ? "dev" : "prod" };
    });

    this.initialized = true;
    log(`${TAG} SDK ready`);

    if (this.queue.length > 0) {
      log(`${TAG} flushing ${this.queue.length} queued event(s)`);
      for (const event of this.queue) {
        if (event.type === "screen") this.trackScreen(event.name, event.properties);
        else if (event.type === "event") this.trackEvent(event.name, event.properties);
        else if (event.type === "error") this.trackError(event.error, event.properties);
      }
      this.queue = [];
    }
  }

  trackScreen(name: string, properties?: Record<string, string>) {
    if (!this.initialized) {
      log(`${TAG} trackScreen QUEUED — screen=${name}`);
      this.queue.push({ type: "screen", name, properties });
      return;
    }
    log(`${TAG} trackScreen — screen=${name}`, properties ?? "");
    this.client!.trackPageView({ name, properties });
  }

  trackEvent(
    name: string,
    properties?: Record<string, string | number | boolean>,
  ) {
    if (!this.initialized) {
      log(`${TAG} trackEvent QUEUED — event=${name}`);
      this.queue.push({ type: "event", name, properties });
      return;
    }
    log(`${TAG} trackEvent — event=${name}`, properties ?? "");
    this.client!.trackEvent({ name }, properties);
  }

  trackError(error: Error, properties?: Record<string, string>) {
    if (!this.initialized) {
      log(`${TAG} trackError QUEUED — error=${error.message}`);
      this.queue.push({ type: "error", error, properties });
      return;
    }
    log(`${TAG} trackError — error=${error.message}`, properties ?? "");
    this.client!.trackException({ exception: error, properties });
  }

  flush() {
    log(`${TAG} flush`);
    this.client?.flush();
  }
}

export const telemetry = new TelemetryService();
