import {ApiClient, routes} from "@lodestar/api";
import {GENESIS_SLOT} from "@lodestar/params";
import {Root, RootHex, Slot} from "@lodestar/types";
import {Logger, fromHex} from "@lodestar/utils";
import {ValidatorEvent, ValidatorEventEmitter} from "./emitter.js";

const {EventType} = routes.events;

export type HeadEventData = {
  slot: Slot;
  head: RootHex;
  previousDutyDependentRoot: RootHex;
  currentDutyDependentRoot: RootHex;
};

type RunEveryFn = (event: HeadEventData) => Promise<void>;

/**
 * Track the head slot/root using the event stream api "head".
 */
export class ChainHeaderTracker {
  private headBlockSlot: Slot = GENESIS_SLOT;
  private headBlockRoot: Root | null = null;
  private readonly fns: RunEveryFn[] = [];

  constructor(
    private readonly logger: Logger,
    private readonly api: ApiClient,
    private readonly emitter: ValidatorEventEmitter
  ) {}

  start(signal: AbortSignal): void {
    this.logger.verbose("Subscribing to head event");
    this.api.events
      .eventstream({
        topics: [EventType.head],
        signal,
        onEvent: this.onHeadUpdate,
        onError: (e) => {
          this.logger.error("Failed to receive head event", {}, e);
        },
        onClose: () => {
          this.logger.verbose("Closed stream for head event", {});
        },
      })
      .catch((e) => this.logger.error("Failed to subscribe to head event", {}, e));
  }

  getCurrentChainHead(slot: Slot): Root | null {
    if (slot >= this.headBlockSlot) {
      return this.headBlockRoot;
    }
    // We don't know head of an old block
    return null;
  }

  runOnNewHead(fn: RunEveryFn): void {
    this.fns.push(fn);
  }

  private onHeadUpdate = (event: routes.events.BeaconEvent): void => {
    if (event.type === EventType.head) {
      const {message} = event;
      const {slot, block, previousDutyDependentRoot, currentDutyDependentRoot} = message;
      this.headBlockSlot = slot;
      this.headBlockRoot = fromHex(block);

      const headEventData = {
        slot: this.headBlockSlot,
        head: block,
        previousDutyDependentRoot: previousDutyDependentRoot,
        currentDutyDependentRoot: currentDutyDependentRoot,
      };

      for (const fn of this.fns) {
        fn(headEventData).catch((e) => this.logger.error("Error calling head event handler", e));
      }

      this.emitter.emit(ValidatorEvent.chainHead, headEventData);

      this.logger.verbose("Found new chain head", {
        slot: slot,
        head: block,
        previousDuty: previousDutyDependentRoot,
        currentDuty: currentDutyDependentRoot,
      });
    }
  };
}
