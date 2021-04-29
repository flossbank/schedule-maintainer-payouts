exports.process = async ({ log, db, sqs }) => {
  log.info('Starting shedule of maintainer payouts')

  const maintainersWithPayouts = await db.getPendingMaintainerPayouts()

  for (const maintainer of maintainersWithPayouts) {
    const { _id } = maintainer

    log.info('Sending sqs distribute message for maintainer %s', _id)
    await sqs.sendDistributeMaintainerPayoutMessage({
      maintainerId: _id
    })
  }

  log.info('Finished, schedule maintainer payouts lambda ending')
  return { success: true }
}
