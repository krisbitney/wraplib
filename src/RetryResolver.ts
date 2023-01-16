import {
  CoreClient,
  IUriResolutionContext,
  IUriResolver,
  Result,
  Uri,
  UriPackageOrWrapper,
} from "@polywrap/core-js";
import {
  UriResolutionResult,
  UriResolver,
  UriResolverLike,
} from "@polywrap/uri-resolvers-js";

export type UriOrAuthorityRetryOptions = {
  retries: number;
  interval: number;
};

export type RetryOptions = {
  [uriOrAuthority: string]: UriOrAuthorityRetryOptions;
};

export class RetryResolver<TError = undefined> implements IUriResolver<TError> {
  constructor(
    private resolver: IUriResolver<TError>,
    private options: RetryOptions
  ) {}

  static from<TResolverError = unknown>(
    resolver: UriResolverLike,
    options: RetryOptions
  ): RetryResolver<TResolverError> {
    return new RetryResolver(
      UriResolver.from<TResolverError>(resolver),
      options
    );
  }

  async tryResolveUri(
    uri: Uri,
    client: CoreClient,
    resolutionContext: IUriResolutionContext
  ): Promise<Result<UriPackageOrWrapper, TError>> {
    const subContext = resolutionContext.createSubHistoryContext();

    const result = await this.resolver.tryResolveUri(uri, client, subContext);

    const isChange = !(
      result.ok &&
      result.value.type === "uri" &&
      result.value.uri.uri === uri.uri
    );

    if (isChange) {
      resolutionContext.trackStep({
        sourceUri: uri,
        result,
        subHistory: subContext.getHistory(),
        description: "RetryResolver",
      });
      return result;
    }

    let retries = 0;
    let interval = 0;
    if (uri.uri in this.options) {
      const uriOrAuthority = this.options[uri.uri];
      retries = uriOrAuthority.retries;
      interval = uriOrAuthority.interval;
    } else if (uri.authority in this.options) {
      const uriOrAuthority = this.options[uri.authority];
      retries = uriOrAuthority.retries;
      interval = uriOrAuthority.interval;
    }

    while (!isChange && retries-- > 0) {
      // sleep
      await new Promise((r) => setTimeout(r, interval));
      const result = await this.resolver.tryResolveUri(uri, client, subContext);

      const isChange = !(
        result.ok &&
        result.value.type === "uri" &&
        result.value.uri.uri === uri.uri
      );

      if (isChange) {
        resolutionContext.trackStep({
          sourceUri: uri,
          result,
          subHistory: subContext.getHistory(),
          description: "RetryResolver",
        });
        return result;
      }
    }

    const noResolution = UriResolutionResult.ok(uri);

    resolutionContext.trackStep({
      sourceUri: uri,
      result: noResolution,
      subHistory: subContext.getHistory(),
      description: "RetryResolver",
    });

    return noResolution;
  }
}
