export const logToWebhook = async (data: any, type: string = "debug") => {
  if (__DEV__) {
    try {
      // Usa https://webhook.site para crear un webhook temporal para debugging
      const webhookUrl = "https://webhook.site/tu-id-único";

      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          timestamp: new Date().toISOString(),
          data,
        }),
      });
    } catch (e) {
      console.log("Error logging to webhook:", e);
    }
  }
};
