import bcrypt from 'bcrypt'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createDatabase } from './src/pds/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function createTestUser() {
  try {
    // Initialize the database
    const dbPath = join(__dirname, 'data/perchpics.db')
    console.log(`Using database at: ${dbPath}`)
    
    const db = await createDatabase()
    
    // Check if test user already exists
    const existingUser = await db.getUserByUsername('test')
    if (existingUser) {
      console.log('Test user already exists')
      return
    }
    
    // Create a password hash
    const passwordHash = await bcrypt.hash('testpassword', 10)
    
    // Generate a simple DID for testing
    const testDid = 'did:test:' + Date.now().toString()
    
    // Create the user
    await db.createUser('test', passwordHash, testDid)
    
    console.log('Test user created successfully')
    console.log('Username: test')
    console.log('Password: testpassword')
    console.log('DID: ' + testDid)
  } catch (error) {
    console.error('Error creating test user:', error)
  }
}

// Run the function
createTestUser()
