const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const usersData = [
  {
    id: 'rh-main',
    username: 'rhadmin',
    fullName: 'Administrateur RH Emergence',
    role: 'rh',
    pw_hash: bcrypt.hashSync('rh2024!Emergence', 10),
    pw: 'rh2024!Emergence',
    disabled: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'agent1',
    username: 'agent1',
    fullName: 'Agent 1 Joy',
    role: 'agent',
    pw_hash: bcrypt.hashSync('agent123!', 10),
    pw: 'agent123!',
    disabled: false,
    created_at: new Date().toISOString()
  }
];

fs.writeFileSync(path.join(__dirname, 'mockUsers.json'), JSON.stringify(usersData, null, 2));
console.log('✅ mockUsers.json créé!');
console.log('Copiez le JSON dans DevTools Local Storage > mockUsers');
console.log('Identifiants:');
usersData.forEach(u => console.log(`  ${u.username}: ${u.pw}`));
