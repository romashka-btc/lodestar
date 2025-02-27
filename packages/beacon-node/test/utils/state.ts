import {SecretKey} from "@chainsafe/blst";
import {PubkeyIndexMap} from "@chainsafe/pubkey-index-map";
import {ChainForkConfig, createBeaconConfig} from "@lodestar/config";
import {config as minimalConfig} from "@lodestar/config/default";
import {FAR_FUTURE_EPOCH, ForkName, ForkSeq, MAX_EFFECTIVE_BALANCE, SYNC_COMMITTEE_SIZE} from "@lodestar/params";
import {
  BeaconStateAllForks,
  BeaconStateBellatrix,
  BeaconStateElectra,
  CachedBeaconStateAllForks,
  CachedBeaconStateBellatrix,
  CachedBeaconStateElectra,
  createCachedBeaconState,
} from "@lodestar/state-transition";
import {BeaconState, altair, bellatrix, electra, ssz} from "@lodestar/types";

import {DataAvailabilityStatus, ExecutionStatus, ProtoBlock} from "@lodestar/fork-choice";
import {ZERO_HASH_HEX} from "../../src/constants/constants.js";
import {getConfig} from "./config.js";
import {generateValidator, generateValidators} from "./validator.js";

/**
 * Copy of BeaconState, but all fields are marked optional to allow for swapping out variables as needed.
 */
type TestBeaconState = Partial<BeaconState>;

/**
 * Generate beaconState, by default it will generate a mostly empty state with "just enough" to be valid-ish
 * NOTE: All fields can be overridden through `opts`.
 *  should allow 1st test calling generateState more time since creating a new instance is expensive.
 *
 * @param {TestBeaconState} opts
 * @param config
 * @returns {BeaconState}
 */
export function generateState(
  opts: TestBeaconState = {},
  config: ChainForkConfig = minimalConfig,
  withPubkey = false
): BeaconStateAllForks {
  const stateSlot = opts.slot ?? 0;
  const state = config.getForkTypes(stateSlot).BeaconState.defaultValue();
  const forkSeq = config.getForkSeq(stateSlot);

  // Mutate state adding properties
  Object.assign(state, opts);

  const validatorOpts = {
    activationEpoch: 0,
    effectiveBalance: MAX_EFFECTIVE_BALANCE,
    withdrawableEpoch: FAR_FUTURE_EPOCH,
    exitEpoch: FAR_FUTURE_EPOCH,
  };
  const numValidators = 16;

  const validators =
    opts.validators ??
    (withPubkey
      ? Array.from({length: numValidators}, (_, i) => {
          const sk = SecretKey.fromBytes(Buffer.alloc(32, i + 1));
          return generateValidator({
            ...validatorOpts,
            pubkey: sk.toPublicKey().toBytes(),
          });
        })
      : generateValidators(numValidators, validatorOpts));

  state.genesisTime = Math.floor(Date.now() / 1000);
  state.slot = stateSlot;
  state.fork.previousVersion = config.GENESIS_FORK_VERSION;
  state.fork.currentVersion = config.GENESIS_FORK_VERSION;
  state.latestBlockHeader.bodyRoot = ssz.phase0.BeaconBlockBody.hashTreeRoot(ssz.phase0.BeaconBlockBody.defaultValue());
  state.validators = validators;
  state.balances = Array.from({length: validators.length}, () => MAX_EFFECTIVE_BALANCE);

  if (forkSeq >= ForkSeq.altair) {
    const stateAltair = state as altair.BeaconState;
    stateAltair.previousEpochParticipation = [...[0xff, 0xff], ...Array.from({length: validators.length - 2}, () => 0)];
    stateAltair.currentEpochParticipation = [...[0xff, 0xff], ...Array.from({length: validators.length - 2}, () => 0)];
    stateAltair.currentSyncCommittee = {
      pubkeys: Array.from({length: SYNC_COMMITTEE_SIZE}, (_, i) => validators[i % validators.length].pubkey),
      aggregatePubkey: ssz.BLSPubkey.defaultValue(),
    };
    stateAltair.nextSyncCommittee = {
      pubkeys: Array.from({length: SYNC_COMMITTEE_SIZE}, (_, i) => validators[i % validators.length].pubkey),
      aggregatePubkey: ssz.BLSPubkey.defaultValue(),
    };
  }

  if (forkSeq >= ForkSeq.bellatrix) {
    const stateBellatrix = state as bellatrix.BeaconState;
    stateBellatrix.latestExecutionPayloadHeader = {
      ...ssz.bellatrix.ExecutionPayloadHeader.defaultValue(),
      blockNumber: 2022,
    };
  }

  if (forkSeq >= ForkSeq.electra) {
    const stateElectra = state as electra.BeaconState;
    stateElectra.depositRequestsStartIndex = 2023n;
    stateElectra.latestExecutionPayloadHeader = ssz.electra.ExecutionPayloadHeader.defaultValue();
  }

  return config.getForkTypes(stateSlot).BeaconState.toViewDU(state);
}

/**
 * This generates state with default pubkey
 * TODO: (@matthewkeil) - this is duplicated and exists in state-transition as well
 */
export function generateCachedState(opts?: TestBeaconState): CachedBeaconStateAllForks {
  const config = getConfig(ForkName.phase0);
  const state = generateState(opts, config);
  return createCachedBeaconState(state, {
    config: createBeaconConfig(config, state.genesisValidatorsRoot),
    // This is a performance test, there's no need to have a global shared cache of keys
    pubkey2index: new PubkeyIndexMap(),
    index2pubkey: [],
  });
}

/**
 * This generates state with default pubkey
 */
export function generateCachedAltairState(opts?: TestBeaconState, altairForkEpoch = 0): CachedBeaconStateAllForks {
  const config = getConfig(ForkName.altair, altairForkEpoch);
  const state = generateState(opts, config);
  return createCachedBeaconState(state, {
    config: createBeaconConfig(config, state.genesisValidatorsRoot),
    // This is a performance test, there's no need to have a global shared cache of keys
    pubkey2index: new PubkeyIndexMap(),
    index2pubkey: [],
  });
}

/**
 * This generates state with default pubkey
 */
export function generateCachedBellatrixState(opts?: TestBeaconState): CachedBeaconStateBellatrix {
  const config = getConfig(ForkName.bellatrix);
  const state = generateState(opts, config);
  return createCachedBeaconState(state as BeaconStateBellatrix, {
    config: createBeaconConfig(config, state.genesisValidatorsRoot),
    // This is a performance test, there's no need to have a global shared cache of keys
    pubkey2index: new PubkeyIndexMap(),
    index2pubkey: [],
  });
}

/**
 * This generates state with default pubkey
 */
export function generateCachedElectraState(opts?: TestBeaconState): CachedBeaconStateElectra {
  const config = getConfig(ForkName.electra);
  const state = generateState(opts, config);
  return createCachedBeaconState(state as BeaconStateElectra, {
    config: createBeaconConfig(config, state.genesisValidatorsRoot),
    pubkey2index: new PubkeyIndexMap(),
    index2pubkey: [],
  });
}
export const zeroProtoBlock: ProtoBlock = {
  slot: 0,
  blockRoot: ZERO_HASH_HEX,
  parentRoot: ZERO_HASH_HEX,
  stateRoot: ZERO_HASH_HEX,
  targetRoot: ZERO_HASH_HEX,

  justifiedEpoch: 0,
  justifiedRoot: ZERO_HASH_HEX,
  finalizedEpoch: 0,
  finalizedRoot: ZERO_HASH_HEX,
  unrealizedJustifiedEpoch: 0,
  unrealizedJustifiedRoot: ZERO_HASH_HEX,
  unrealizedFinalizedEpoch: 0,
  unrealizedFinalizedRoot: ZERO_HASH_HEX,

  timeliness: false,

  ...{executionPayloadBlockHash: null, executionStatus: ExecutionStatus.PreMerge},
  dataAvailabilityStatus: DataAvailabilityStatus.PreData,
};
