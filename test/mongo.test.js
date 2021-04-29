const test = require('ava')
const sinon = require('sinon')
const { MongoMemoryServer } = require('mongodb-memory-server')
const Config = require('../lib/config')
const Mongo = require('../lib/mongo')

test.before(async (t) => {
  const config = new Config({
    kms: {}
  })

  const mongo = new MongoMemoryServer()
  const mongoUri = await mongo.getUri()

  config.decrypt = sinon.stub().returns(mongoUri)
  t.context.Mongo = new Mongo({ config, log: { info: sinon.stub() } })
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

  const { insertedId: userId6 } = await t.context.Mongo.db.collection('users').insertOne({
    name: 'russia',
    payoutInfo: {
      ilpPointer: 'test-ilp-pointer'
    },
    payouts: [{
      id: 'aaaaaaaaaaa2',
      amount: 150,
      donationIds: ['bbbbbbbbbbbb'],
      adIds: ['dddddddddddd'],
      timestamp: 123456,
      paid: true
    }]
  })
  t.context.userIdWithPaidPayouts = userId6
})

test.after(async (t) => {
  await t.context.Mongo.close()
})

test('getPendingMaintainerPayouts', async (t) => {
  const maintainersWithPayouts = await t.context.Mongo.getPendingMaintainerPayouts()

  t.true(maintainersWithPayouts.length === 2)
  t.true(maintainersWithPayouts.some((m) => m._id.toString() === t.context.userIdWithPayoutsAndIlp.toString()))
  t.true(maintainersWithPayouts.some((m) => m._id.toString() === t.context.userIdWithJustOnePayout.toString()))

  const maintainerWithMultiplePayouts = maintainersWithPayouts.find((m) => m._id.toString() === t.context.userIdWithPayoutsAndIlp.toString())
  t.deepEqual(maintainerWithMultiplePayouts.payouts, t.context.maintainer1Payouts)
})
