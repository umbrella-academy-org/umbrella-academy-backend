declare module '@emailjs/nodejs' {
  interface EmailJSRequest {
    status: number;
    text: string;
  }

  interface EmailJSResponseStatus {
    status: number;
    text: string;
  }

  function send(
    serviceID: string,
    templateID: string,
    templateParams: Record<string, any>,
    options?: {
      publicKey: string;
      privateKey?: string;
    }
  ): Promise<EmailJSResponseStatus>;

  export = { send };
}
