import { defaultPackages, PolywrapClient } from "@polywrap/client-js";
import { Result, ResultOk } from "@polywrap/result";
import { invokeWithTimeout } from "../src";


jest.setTimeout(200000);

const createRacePromise = (
  timeout: number
): Promise<Result<Uint8Array, Error>> => {
  return new Promise<Result<Uint8Array, Error>>((resolve) =>
    setTimeout(() => {
      resolve(ResultOk(Uint8Array.from([1, 2, 3, 4])));
    }, timeout)
  );
};

describe("invokeWithTimeout", () => {

  const client: PolywrapClient = new PolywrapClient();

  it("invokes normally", async () => {
    const result = await invokeWithTimeout(client, {
      uri: defaultPackages.http,
      method: "get",
      args: {
        url: "https://httpbin.org/get"
      }
    }, 2000);

    if (!result.ok) fail(result.error);
    expect(result.value).toBeTruthy();
  });

  it("cancels invocation when timeout expires after 1000ms", async () => {
    const invokePromise = invokeWithTimeout(client, {
      uri: defaultPackages.http,
      method: "get",
      args: {
        url: "https://httpbin.org/delay/2"
      }
    }, 1000);

    const fasterRacePromise = createRacePromise(900);
    const slowerRacePromise = createRacePromise(1100);

   const [fasterRaceResult, slowerRaceResult] = await Promise.all([
     Promise.race([
       fasterRacePromise,
       invokePromise,
     ]),
     Promise.race([
       invokePromise,
       slowerRacePromise,
     ])
   ]);

    if (!fasterRaceResult.ok) fail(fasterRaceResult.error);
    const expectedFasterResult = await fasterRacePromise;
    if (!expectedFasterResult.ok) fail(expectedFasterResult.error);
    expect(fasterRaceResult.value).toStrictEqual(expectedFasterResult.value);

    const expectedSlowerResult = await invokePromise;
    if (expectedSlowerResult.ok) throw Error("Expected invocation to abort with timeout");
    expect(slowerRaceResult).toStrictEqual(expectedSlowerResult);
  });

  it("cancels invocation when timeout expires after 500ms", async () => {
    const invokePromise = invokeWithTimeout(client, {
      uri: defaultPackages.http,
      method: "get",
      args: {
        url: "https://httpbin.org/delay/1"
      }
    }, 500);

    const fasterRacePromise = createRacePromise(450);
    const slowerRacePromise = createRacePromise(550);

    const [fasterRaceResult, slowerRaceResult] = await Promise.all([
      Promise.race([
        fasterRacePromise,
        invokePromise,
      ]),
      Promise.race([
        invokePromise,
        slowerRacePromise,
      ])
    ]);

    if (!fasterRaceResult.ok) fail(fasterRaceResult.error);
    const expectedFasterResult = await fasterRacePromise;
    if (!expectedFasterResult.ok) fail(expectedFasterResult.error);
    expect(fasterRaceResult.value).toStrictEqual(expectedFasterResult.value);

    const expectedSlowerResult = await invokePromise;
    if (expectedSlowerResult.ok) throw Error("Expected invocation to abort with timeout");
    expect(slowerRaceResult).toStrictEqual(expectedSlowerResult);
  });
});
