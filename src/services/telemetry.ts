import { ApplicationInsights } from "@microsoft/applicationinsights-web";
import { ITelemetryItem } from "@microsoft/applicationinsights-core-js";
import { ReactNativeManualDevicePlugin } from "@microsoft/applicationinsights-react-native";

const INSTRUMENTATION_KEY = process.env.EXPO_PUBLIC_APPINSIGHTS_KEY ?? "";

class TelemetryService {
  private client: ApplicationInsights | null = null;
  private initialized = false;

  init(userId: string, role: string) {
    if (this.initialized) return;

    this.client = new ApplicationInsights({
      config: {
        instrumentationKey: INSTRUMENTATION_KEY,
        disableAjaxTracking: false,
        disableFetchTracking: false,
        enableAutoRouteTracking: false,
        extensions: [new ReactNativeManualDevicePlugin()],
      },
    });

    this.client.loadAppInsights();
    this.client.setAuthenticatedUserContext(userId);
    this.client.addTelemetryInitializer((envelope: ITelemetryItem) => {
      envelope.data = { ...envelope.data, role };
    });

    this.initialized = true;
  }

  trackScreen(name: string, properties?: Record<string, string>) {
    if (!this.initialized) return;
    this.client!.trackPageView({ name, properties });
  }

  trackEvent(
    name: string,
    properties?: Record<string, string | number | boolean>,
  ) {
    if (!this.initialized) return;
    this.client!.trackEvent({ name }, properties);
  }

  trackError(error: Error, properties?: Record<string, string>) {
    if (!this.initialized) return;
    this.client!.trackException({ exception: error, properties });
  }

  flush() {
    this.client?.flush();
  }
}

export const telemetry = new TelemetryService();
