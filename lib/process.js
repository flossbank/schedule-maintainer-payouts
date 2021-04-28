exports.process = async ({ log, db, sqs }) => {
  log.info('Starting shedule of maintainer payouts')

  const maintainersWithPayouts = await db.getPendingMaintainerPayouts()

  for (const maintainer of maintainersWithPayouts) {
    const { _id, payouts } = maintainer
    const pendingPayoutIds = payouts.filter(p => !p.paid).map(({ id }) => id)

    log.info('Sending sqs distribute message for maintainer %s with %d payout ids', _id, pendingPayoutIds.length)
    await sqs.sendDistributeMaintainerPayoutMessage({
      maintainerId: _id,
      pendingPayoutIds
    })
  }

  log.info('Finished, schedule maintainer payouts lambda ending')
  return { success: true }
}
