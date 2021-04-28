class Config {
  constructor ({ kms }) {
    this.kms = kms
    this.configCache = new Map()
  }

  async decrypt (data) {
    return this.kms.decrypt({
      CiphertextBlob: Buffer.from(data, 'base64')
    }).promise().then(decrypted => decrypted.Plaintext.toString())
  }

  async getDistributeMaintainerPayoutQueueUrl () {
    if (this.configCache.has('distributeMaintainerPayoutQueueUrl')) {
      return this.configCache.get('distributeMaintainerPayoutQueueUrl')
    }
    const queueUrl = await this.decrypt(process.env.DISTRIBUTE_MAINTAINER_PAYOUT_QUEUE_URL)
    this.configCache.set('distributeMaintainerPayoutQueueUrl', queueUrl)
    return queueUrl
  }

  async getMongoUri () {
    if (this.configCache.has('mongoUri')) {
      return this.configCache.get('mongoUri')
    }
    const mongoUri = await this.decrypt(process.env.MONGO_URI)
    this.configCache.set('mongoUri', mongoUri)
    return mongoUri
  }
}

module.exports = Config
