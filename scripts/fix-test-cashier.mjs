import fs from 'node:fs'

const file = 'backend/src/test/java/vn/doan/assetmanager/RoleAuthorizationTest.java'
let content = fs.readFileSync(file, 'utf8')
const matches = content.match(/cashier/gi)
console.log('Matches found:', matches?.length || 0)
content = content.replaceAll('"cashier"', '"staff"')
content = content.replaceAll("'cashier'", "'staff'")
fs.writeFileSync(file, content, 'utf8')
console.log('Updated RoleAuthorizationTest!')
