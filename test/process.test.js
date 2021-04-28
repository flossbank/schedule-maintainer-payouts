const test = require('ava')
const sinon = require('sinon')
const { MongoMemoryServer } = require('mongodb-memory-server')
const Config = require('../lib/config')
const Mongo = require('../lib/mongo')
const Process = require('../lib/process')
const Sqs = require('../lib/sqs')

test.before(async (t) => {
  const config = new Config({
    kms: {}
  })

  const mongo = new MongoMemoryServer()
  const mongoUri = await mongo.getUri()

  config.decrypt = sinon.stub().returns(mongoUri)
  t.context.Mongo = new Mongo({ config, log: { info: sinon.stub() } })
  t.context.fakeAwsSqs = {
    sendMessage: sinon.fake.returns({
      promise: sinon.stub()
    })
  }
  t.context.sqs = new Sqs({
    config,
    sqs: t.context.fakeAwsSqs
  })
  await t.context.Mongo.connect()

  t.context.maintainer1Payouts = [
    {
      id: 'aaaaaaaaaaa6',
      amount: 100,
      donationIds: ['bbbbbbbbbbbb'],
      adIds: ['dddddddddddd'],
      timestamp: 123456,
      paid: true
    },
    {
      id: 'aaaaaaaaaaaa',
      amount: 100,
      donationIds: ['bbbbbbbbbbbb'],
      adIds: ['dddddddddddd'],
      timestamp: 123456
    },
    {
      id: 'aaaaaaaaaaa1',
      amount: 150,
      donationIds: ['bbbbbbbbbbbb'],
      adIds: ['dddddddddddd'],
      timestamp: 123456
    }
  ]
  const { insertedId: userId1 } = await t.context.Mongo.db.collection('users').insertOne({
    name: 'austria',
    payoutInfo: {
      ilpPointer: 'test-ilp-pointer'
    },
    payouts: t.context.maintainer1Payouts
  })
  t.context.userIdWithPayoutsAndIlp = userId1

  const { insertedId: userId2 } = await t.context.Mongo.db.collection('users').insertOne({
    name: 'australia',
    payouts: [{
      id: 'aaaaaaaaaaaa',
      amount: 100,
      donationIds: ['bbbbbbbbbbbb'],
      adIds: ['dddddddddddd'],
      timestamp: 123456
    }]
  })
  t.context.userIdWithNoIlp = userId2

  const { insertedId: userId3 } = await t.context.Mongo.db.collection('users').insertOne({
    name: 'belgium',
    payoutInfo: {
      ilpPointer: 'test-ilp-pointer'
    }
  })
  t.context.userIdWithNoPayouts = userId3

  const { insertedId: userId4 } = await t.context.Mongo.db.collection('users').insertOne({
    name: 'swiss'
  })
  t.context.userIdWithNothing = userId4

  const { insertedId: userId5 } = await t.context.Mongo.db.collection('users').insertOne({
    name: 'czech',
    payoutInfo: {
      ilpPointer: 'test-ilp-pointer'
    },
    payouts: [{
      id: 'aaaaaaaaaaa2',
      amount: 150,
      donationIds: ['bbbbbbbbbbbb'],
      adIds: ['dddddddddddd'],
      timestamp: 123456
    }]
  })
  t.context.userIdWithJustOnePayout = userId5
})

test.after(async (t) => {
  await t.context.Mongo.close()
})

test.only('should find maintainers with payouts and send sqs messages successfully', async (t) => {
  await Process.process({ db: t.context.Mongo, log: { info: sinon.stub() }, sqs: t.context.sqs })
  const sqsCalls = t.context.fakeAwsSqs.sendMessage.getCalls()

  // Given the first maintainer payouts and the fifth with just 1, we should send 2 messages to the queue.
  // No other maintainers should have messages sent
  t.true(sqsCalls.length === 2)

  // t.context.userIdWithPayoutsAndIlp should have a payout event sent with TWO payout objects, since one of
  // the three is paid: true
  t.deepEqual(JSON.parse(sqsCalls[0].args[0].MessageBody), {
    maintainerId: t.context.userIdWithPayoutsAndIlp.toString(),
    pendingPayoutIds: ['aaaaaaaaaaaa', 'aaaaaaaaaaa1']
  })

  // t.context.userIdWithJustOnePayout should have a payout event sent for their one payout
  t.deepEqual(JSON.parse(sqsCalls[1].args[0].MessageBody), {
    maintainerId: t.context.userIdWithJustOnePayout.toString(),
    pendingPayoutIds: ['aaaaaaaaaaa2']
  })
})
