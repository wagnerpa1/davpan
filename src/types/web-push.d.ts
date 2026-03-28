declare module "web-push" {
  interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  interface VapidDetails {
    subject: string;
    publicKey: string;
    privateKey: string;
  }

  interface WebPush {
    setVapidDetails(
      subject: string,
      publicKey: string,
      privateKey: string,
    ): void;
    sendNotification(
      subscription: PushSubscription,
      payload?: string,
      options?: Record<string, unknown>,
    ): Promise<void>;
  }

  const webpush: WebPush;
  export default webpush;
}
