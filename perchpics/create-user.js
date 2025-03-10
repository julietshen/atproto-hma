import { PDS } from './src/index.js'
import { randomStr } from '@atproto/crypto'
import bcrypt from 'bcrypt'

const main = async () => {
  const pds = await PDS.create({
    port: 3001,
    dataDirectory: '/var/atproto/pds-data'
  })
  
  const passwordHash = bcrypt.hashSync('your-password-here', 10)
  
  await pds.ctx.accountManager.createAccount({
    email: 'test@example.com',
    handle: 'test.yourdomain.com',
    password: passwordHash,
    did: `did:plc:${randomStr(24)}`
  })
  
  console.log('Test user created successfully')
  process.exit(0)
}

main()
