import { ClientConfigBuilder, defaultPackages, PolywrapClient } from "@polywrap/client-js";
import { ipfsPlugin } from "@polywrap/ipfs-plugin-js";
import { ipfsResolverPlugin } from "@polywrap/ipfs-resolver-plugin-js";
import {
  PackageToWrapperCacheResolver,
  RecursiveResolver,
  StaticResolver,
  WrapperCache,
} from "@polywrap/uri-resolvers-js";
import { ExtendableUriResolver } from "@polywrap/uri-resolver-extensions-js";
import { defaultIpfsProviders, } from "@polywrap/client-config-builder-js";
import { httpPlugin } from "@polywrap/http-plugin-js";
import { httpResolverPlugin } from "@polywrap/http-resolver-plugin-js";
import { RetryOptions, RetryResolver } from "../../build";

export const getClientWithRetryResolver = (retryOptions: RetryOptions): PolywrapClient => {
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
