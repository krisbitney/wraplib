import { UriResolutionContext } from "@polywrap/core-js";
import { expectHistory } from "./helpers/expectHistory";
import { ClientConfigBuilder, PolywrapClient } from "@polywrap/client-js";
import { RecursiveResolver } from "@polywrap/uri-resolvers-js";
import { InterfaceRedirectResolver } from "../src/InterfaceRedirectResolver";
import { mockPluginRegistration } from "./helpers/mockPluginRegistration";

jest.setTimeout(200000);

const getClientWithInterfaceRedirectResolver = (interfaceUri: string, packageUri: string): PolywrapClient => {
  const resolver = RecursiveResolver.from([
    mockPluginRegistration(packageUri),
    new InterfaceRedirectResolver(),
  ]);

  const config = new ClientConfigBuilder(undefined, resolver)
    .addInterfaceImplementations(
      interfaceUri,
      [packageUri]
    )
    .buildCoreConfig();

  return new PolywrapClient(config, { noDefaults: true });
};

describe("RetryResolver", () => {

  it("redirects from interface uri to implementation", async () => {
    const interfaceUri = "wrap://ens/wrappers.polywrap.eth:uri-resolver-ext@1.1.0";
    const packageUri = "wrap://package/uri-resolver";
    const client = getClientWithInterfaceRedirectResolver(interfaceUri, packageUri);

    // resolve uri
    const resolutionContext = new UriResolutionContext();
    const result = await client.tryResolveUri({ uri: interfaceUri, resolutionContext });

    if (!result.ok) throw result.error;

    await expectHistory(
      resolutionContext.getHistory(),
      "interface-to-implementation-redirect"
    );

    expect(result.value.type).toEqual("package");
    expect(result.value.uri.uri).toEqual(packageUri);
  });
});