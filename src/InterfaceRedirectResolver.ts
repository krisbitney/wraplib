import { ResolverWithHistory, UriResolutionResult } from "@polywrap/uri-resolvers-js";
import {
  CoreClient,
  IUriResolutionContext,
  Result,
  Uri,
  UriPackageOrWrapper,
} from "@polywrap/core-js";

export class InterfaceRedirectResolver extends ResolverWithHistory {
  private redirects: Map<string, Uri> = new Map();
  private initialized: boolean;

  protected getStepDescription = (uri: Uri): string => {
    const redirect = this.redirects.get(uri.uri);
    if (!redirect) return "InterfaceRedirect - Miss";
    return `InterfaceRedirect (${uri.uri} - ${redirect})`;
  };

  private setInterfaceRedirects(client: CoreClient): void {
    client.getInterfaces()?.forEach((i) => i.implementations.length && this.redirects.set(i.interface.uri, i.implementations[0]));
  }

  protected async _tryResolveUri(
    uri: Uri,
    client: CoreClient,
    resolutionContext: IUriResolutionContext
  ): Promise<Result<UriPackageOrWrapper>> {
    if (!this.initialized) {
      this.setInterfaceRedirects(client);
      this.initialized = true;
    }
    const implementation = this.redirects.get(uri.uri);
    if (implementation) {
      return UriResolutionResult.ok(implementation);
    }
    return UriResolutionResult.ok(uri);
  }
}