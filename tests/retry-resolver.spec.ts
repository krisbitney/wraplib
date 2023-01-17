import { buildCleanUriHistory, IUriResolutionStep, Uri, UriResolutionContext } from "@polywrap/core-js";
import { getClientWithRetryResolver } from "./helpers/getClientWithRetryResolver";
import fs from "fs";

jest.setTimeout(200000);

const expectHistory = async (
  receivedHistory: IUriResolutionStep<unknown>[] | undefined,
  historyFileName: string
): Promise<void> => {
  if (!receivedHistory) {
    fail("History is not defined");
  }

  const expectedCleanHistoryStr = await fs.promises.readFile(
    `${__dirname}/histories/${historyFileName}.json`,
    "utf-8"
  );
  const expectedCleanHistory = JSON.stringify(JSON.parse(expectedCleanHistoryStr), null, 2);

  const receivedCleanHistory = JSON.stringify(buildCleanUriHistory(receivedHistory), null, 2);

  expect(receivedCleanHistory).toEqual(expectedCleanHistory);
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
