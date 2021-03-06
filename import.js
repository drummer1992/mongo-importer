'use strict'

const readLine = require('readline')
const assert = require('assert')

const { MongoClient } = require('mongodb')

const DEFAULT_URL = 'mongodb://localhost:27017'

const OPERATIONS = [
  'count',
  'find',
  'findOne',
  'insertOne',
  'deleteOne',
  'deleteMany',
]

const rl = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = rl.question

const getJson = (path = '') => {
  try {
    return require(path.includes('./') ? path : './' + path)
  } catch {
    console.error('Not valid file path')

    process.exit()
  }
}

const parseQuery = query => {
  // foo='bar', baz=42
  const entries = query.split(', ').map(keyValue => keyValue.split('='))

  return entries.reduce((query, [key, value]) =>
    Object.assign(query, { [key]: isNaN(Number(value)) ? value : Number(value) }), {})
}

const errorHandler = error => {
  console.error(error.message)

  process.exit()
}

rl.question = message => new Promise(resolve => question.call(rl, message, answer => resolve(answer)))

const invokeRequest = async (collection, isCount) => {
  const operation = isCount
    ? 'count'
    : await rl.question('Which operation?')

  const query = isCount
    ? {}
    : parseQuery(await rl.question('Print query like: foo=\'bar\', baz=42\n'))

  assert(OPERATIONS.includes(operation), 'Not valid operation: ' + operation)

  let output

  if (operation === 'count') {
    output = await collection.find(query).count()
  } else if (operation === 'find') {
    output = await collection[operation](query).toArray()
  } else {
    output = await collection[operation](query)
  }

  console.dir(isCount ? { countOfInsertedDocuments: output } : output, { depth: Infinity })
}

async function run() {
  const customUrl = await rl.question('Custom mongo url (localhost:27017 by default): ')
  const dbName = await rl.question('Data base name: ')

  assert(dbName, 'Data base name is required')

  const collectionName = await rl.question('Collection name: ')

  assert(collectionName, 'Collection name is required')

  const file = await rl.question('File name: ')

  assert(file, 'File is required')

  const client = await MongoClient.connect(
    customUrl || DEFAULT_URL,
    { useUnifiedTopology: true },
  )

  const db = client.db(dbName)
  const collection = db.collection(collectionName)

  await collection.insertMany(getJson(file))

  await rl.question('File already imported, do you need some mongo request?')
    ? await invokeRequest(collection)
    : await invokeRequest(collection, true)

  await client.close()
}

run().catch(errorHandler).finally(() => process.exit())
