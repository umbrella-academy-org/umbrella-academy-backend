declare module '@emailjs/nodejs' {
  interface EmailJsKeys {
    publicKey: string;
    privateKey?: string;
  }

  interface EmailJs {
    send(
      serviceId: string,
      templateId: string,
      templateParams: Record<string, string>,
      options?: EmailJsKeys
    ): Promise<unknown>;
  }

  const emailjs: EmailJs;
  export default emailjs;
}
