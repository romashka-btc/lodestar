import {SignedBeaconBlock} from "@lodestar/types";
import {CachedBeaconStateAllForks, CachedBeaconStateAltair, CachedBeaconStatePhase0} from "../../src/index.js";
import {EpochTransitionCache} from "../../src/types.js";

// Type aliases to typesafe itBench() calls

export type State = CachedBeaconStateAllForks;
export type StateAltair = CachedBeaconStateAltair;
export type StateBlock = {state: CachedBeaconStateAllForks; block: SignedBeaconBlock};
export type StateEpoch = {state: CachedBeaconStateAllForks; cache: EpochTransitionCache};
export type StatePhase0Epoch = {state: CachedBeaconStatePhase0; cache: EpochTransitionCache};
export type StateAltairEpoch = {state: CachedBeaconStateAltair; cache: EpochTransitionCache};
