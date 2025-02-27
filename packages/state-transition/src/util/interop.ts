import {digest} from "@chainsafe/as-sha256";
import {SecretKey} from "@chainsafe/blst";
import {bytesToBigInt, intToBytes} from "@lodestar/utils";
import {toBufferBE} from "bigint-buffer";

let curveOrder: bigint;
function getCurveOrder(): bigint {
  if (!curveOrder) curveOrder = BigInt("52435875175126190479447740508185965837690552500527637822603658699938581184513");
  return curveOrder;
}

export function interopSecretKeys(validatorCount: number): SecretKey[] {
  return Array.from({length: validatorCount}, (_, i) => {
    return interopSecretKey(i);
  });
}

export function interopSecretKey(index: number): SecretKey {
  const CURVE_ORDER = getCurveOrder();
  const secretKeyBytes = toBufferBE(bytesToBigInt(digest(intToBytes(index, 32))) % CURVE_ORDER, 32);
  return SecretKey.fromBytes(secretKeyBytes);
}
