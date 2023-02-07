import { UriResolutionContext } from "@polywrap/core-js";
import { expectHistory } from "./helpers/expectHistory";
import { ClientConfigBuilder, defaultPackages, PolywrapClient } from "@polywrap/client-js";
import { RecursiveResolver, StaticResolver } from "@polywrap/uri-resolvers-js";
import { ipfsResolverPlugin } from "@polywrap/ipfs-resolver-plugin-js";
import { ExtendableUriResolver } from "@polywrap/uri-resolver-extensions-js";
import { InterfaceRedirectResolver } from "../src/InterfaceRedirectResolver";

jest.setTimeout(200000);

const getClientWithInterfaceRedirectResolver = (): PolywrapClient => {
  const resolver = RecursiveResolver.from([
    StaticResolver.from([
      {
        uri: defaultPackages.ipfsResolver,
        package: ipfsResolverPlugin({}),
      },
    ]),
    new InterfaceRedirectResolver(),
  ]);

  const config = new ClientConfigBuilder(undefined, resolver)
    .addInterfaceImplementations(
      ExtendableUriResolver.extInterfaceUri,
      [
        defaultPackages.ipfsResolver,
      ]
    )
    .buildCoreConfig();

  return new PolywrapClient(config, { noDefaults: true });
};

describe("RetryResolver", () => {

  it("redirects from interface uri to implementation", async () => {
    const client = getClientWithInterfaceRedirectResolver();

    // resolve uri
    const uri = ExtendableUriResolver.extInterfaceUri;
    const resolutionContext = new UriResolutionContext();
    const result = await client.tryResolveUri({ uri, resolutionContext });

    if (!result.ok) throw result.error;

    await expectHistory(
      resolutionContext.getHistory(),
      "interface-to-implementation-redirect"
    );

    expect(result.value.type).toEqual("package");
    expect(result.value.uri.uri).toEqual("wrap://ens/ipfs-resolver.polywrap.eth");
  });
});
