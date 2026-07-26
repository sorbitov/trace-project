import { config } from "./config.js";
import { chainConfigured, escrowInterface, provider } from "./chain.js";

export async function syncEscrowEvents(db) {
  if (!chainConfigured()) return { configured: false, processed: 0 };
  const latest = await provider.getBlockNumber();
  let from = (await db.getIndexerBlock()) ?? Math.max(0, config.arc.deploymentBlock);
  if (from > latest) return { configured: true, processed: 0, latest };
  let processed = 0;

  while (from <= latest) {
    const to = Math.min(latest, from + 1_999);
    const logs = await provider.getLogs({ address: config.arc.escrowAddress, fromBlock: from, toBlock: to });
    const blockTimes = new Map();
    for (const log of logs) {
      let parsed;
      try { parsed = escrowInterface.parseLog(log); } catch { continue; }
      if (!parsed) continue;
      if (!blockTimes.has(log.blockNumber)) {
        blockTimes.set(log.blockNumber, new Date((await provider.getBlock(log.blockNumber)).timestamp * 1000));
      }
      const at = blockTimes.get(log.blockNumber);
      if (parsed.name === "PaymentCreated") {
        await db.markFundedFromEvent({
          onchainPaymentId: parsed.args.paymentId.toString(),
          senderWallet: parsed.args.sender,
          identityHash: parsed.args.identityHash,
          amountUnits: parsed.args.amount.toString(),
          txHash: log.transactionHash,
          fundedAt: at,
        });
      } else {
        const statuses = { PaymentClaimed: "claimed", PaymentCancelled: "cancelled", PaymentRefunded: "refunded" };
        if (statuses[parsed.name]) {
          await db.markSettlement(
            parsed.args.paymentId.toString(),
            statuses[parsed.name],
            log.transactionHash,
            parsed.name === "PaymentClaimed" ? parsed.args.recipient : null,
            at,
          );
        }
      }
      processed += 1;
    }
    await db.setIndexerBlock(to + 1);
    from = to + 1;
  }
  await db.expirePending();
  return { configured: true, processed, latest };
}

export function startIndexer(db) {
  if (!chainConfigured()) return () => {};
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await syncEscrowEvents(db); } catch (error) { console.error("Indexer error", error); }
    finally { running = false; }
  };
  const timer = setInterval(tick, config.arc.indexerPollMs);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
