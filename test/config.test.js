const test = require('ava')
const sinon = require('sinon')
const Config = require('../lib/config')

test.beforeEach((t) => {
  t.context.config = new Config({
    kms: {
      decrypt: sinon.stub().returns({
        promise: sinon.stub().resolves({
          Plaintext: Buffer.from('abc')
        })
      })
    },
    dynamo: {
      getConfigValue: sinon.stub()
    }
  })
})

test('getMongoUri decrypts with kms and caches result', async (t) => {
  const { config } = t.context
  process.env.MONGO_URI = Buffer.from('abc').toString('base64')
  t.is(await config.getMongoUri(), 'abc')
  t.true(config.kms.decrypt.calledOnce)
  config.kms.decrypt.resetHistory()

  t.is(await config.getMongoUri(), 'abc')
  t.true(config.kms.decrypt.notCalled)
})

test('getDistributeMaintainerPayoutQueueUrl reads from env', async (t) => {
  const { config } = t.context
  process.env.DISTRIBUTE_MAINTAINER_PAYOUT_QUEUE_URL = 'dmpqu'
  t.is(config.getDistributeMaintainerPayoutQueueUrl(), 'dmpqu')
})
