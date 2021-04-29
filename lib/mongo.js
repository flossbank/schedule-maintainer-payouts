const { MongoClient } = require('mongodb')

const MONGO_DB = 'flossbank_db'
const MAINTAINERS_COLLECTION = 'users'

class Mongo {
  constructor ({ config, log }) {
    this.log = log
    this.config = config
    this.db = null
    this.mongoClient = null
  }

  async connect () {
    const mongoUri = await this.config.getMongoUri()
    this.mongoClient = new MongoClient(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    await this.mongoClient.connect()

    this.db = this.mongoClient.db(MONGO_DB)
  }

  async close () {
    if (this.mongoClient) return this.mongoClient.close()
  }

  async getPendingMaintainerPayouts () {
    // Grab all maintainers who have a payout method (ILP pointer or otherwise)
    // and also have payouts that have not been paid
    return this.db.collection(MAINTAINERS_COLLECTION).find({
      'payoutInfo.ilpPointer': { $ne: null },
      'payouts.paid': { $eq: null },
      payouts: { $ne: null }
    }, {
      _id: 1,
      payouts: 1
    }).toArray()
  }
}

module.exports = Mongo
