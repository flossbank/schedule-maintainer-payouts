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

  getDistributeMaintainerPayoutQueueUrl () {
    return process.env.DISTRIBUTE_MAINTAINER_PAYOUT_QUEUE_URL
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
