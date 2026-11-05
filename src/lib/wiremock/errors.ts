export type WireMockErrorKind = "network" | "timeout" | "auth" | "not-found" | "unsupported" | "http" | "invalid";

export class WireMockError extends Error {
  constructor(
    public kind: WireMockErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "WireMockError";
  }
}

export function describeError(err: unknown): string {
  if (err instanceof WireMockError) {
    switch (err.kind) {
      case "network":
        return "Não foi possível alcançar a instância WireMock (rede ou CORS).";
      case "timeout":
        return "A instância WireMock não respondeu dentro do timeout configurado.";
      case "auth":
        return "Erro de autenticação: verifique o token configurado.";
      case "not-found":
        return "Recurso não encontrado na instância.";
      case "unsupported":
        return "Este recurso não é suportado pela versão do WireMock conectada.";
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : String(err);
}
