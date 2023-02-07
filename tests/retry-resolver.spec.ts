import { Uri, UriResolutionContext } from "@polywrap/core-js";
import { expectHistory } from "./helpers";
import { RetryResolver, RetryResolverOptions } from "../build";
import { ClientConfigBuilder, defaultPackages, PolywrapClient } from "@polywrap/client-js";
import {
  PackageToWrapperCacheResolver,
  RecursiveResolver,
  StaticResolver,
  WrapperCache,
} from "@polywrap/uri-resolvers-js";
import { ipfsPlugin } from "@polywrap/ipfs-plugin-js";
import { ipfsResolverPlugin } from "@polywrap/ipfs-resolver-plugin-js";
import { httpPlugin } from "@polywrap/http-plugin-js";
import { httpResolverPlugin } from "@polywrap/http-resolver-plugin-js";
import { ExtendableUriResolver } from "@polywrap/uri-resolver-extensions-js";
import { defaultIpfsProviders } from "@polywrap/client-config-builder-js";

jest.setTimeout(200000);

const getClientWithRetryResolver = (retryOptions: RetryResolverOptions): PolywrapClient => {
  const resolver = RecursiveResolver.from(
    PackageToWrapperCacheResolver.from(
      [
        StaticResolver.from([
          {
            uri: defaultPackages.ipfs,
            package: ipfsPlugin({}),
          },
          {
            uri: defaultPackages.ipfsResolver,
            package: ipfsResolverPlugin({}),
          },
          {
            uri: defaultPackages.http,
            package: httpPlugin({})
          },
          {
            uri: defaultPackages.httpResolver,
            package: httpResolverPlugin({})
          }
        ]),
        new RetryResolver(
          new ExtendableUriResolver(),
          retryOptions
        )
      ],
      new WrapperCache()
    )
  );

  const config = new ClientConfigBuilder(undefined, resolver)
    .addEnv(
      defaultPackages.ipfs,
      {
        provider: defaultIpfsProviders[0],
        fallbackProviders: defaultIpfsProviders.slice(1),
      })
    .addInterfaceImplementations(
      ExtendableUriResolver.extInterfaceUri,
      [
        defaultPackages.ipfsResolver,
        defaultPackages.httpResolver,
      ]
    )
    .buildCoreConfig();

  return new PolywrapClient(config, { noDefaults: true });
};

describe("RetryResolver", () => {

  it("resolves wrapper without using retries", async () => {
    const uri = new Uri("wrap://ipfs/QmdEMfomFW1XqoxcsCEnhujn9ebQezUXw8pmwLtecyR6F6");

    const client = getClientWithRetryResolver({ ipfs: { retries: 2, interval: 100 }});

    const resolutionContext = new UriResolutionContext();
    const result = await client.tryResolveUri({ uri, resolutionContext });

    if (!result.ok) throw result.error;

    await expectHistory(
      resolutionContext.getHistory(),
      "no-retries-resolves"
    );

    expect(result.value.type).toEqual("wrapper");
  });

  it("two retries - does not resolve", async () => {
    const uri = new Uri("wrap://ipfs/QmdEMfomFW1XqoxcsCEnhujn9ebQezUXw8pmwLtecyR6F7");

    const client = getClientWithRetryResolver({ ipfs: { retries: 2, interval: 100 }});

    const resolutionContext = new UriResolutionContext();
    const result = await client.tryResolveUri({ uri, resolutionContext });

    if (!result.ok) throw result.error;

    await expectHistory(
      resolutionContext.getHistory(),
      "two-retries-no-resolution"
    );
  });
});
