const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Force seed users in local mock data
const usersData = [
  {
    id: 'rh-main',
    username: 'rhadmin',
    fullName: 'Administrateur RH Emergence',
    role: 'rh',
    pw: 'rh2024!Emergence',
    pw_hash: bcrypt.hashSync('rh2024!Emergence', 10),
    disabled: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'agent1',
    username: 'agent1',
    fullName: 'Agent 1 Joy',
    role: 'agent',
    pw: 'agent123!',
    pw_hash: bcrypt.hashSync('agent123!', 10),
    disabled: false,
    created_at: new Date().toISOString()
  }
];

console.log('✅ Users seeded:', usersData.map(u => `${u.username}/${u.pw}`));

console.log('💾 Sauvegardé dans mockUsers.json - Copiez en localStorage DevTools');

fs.writeFileSync(path.join(__dirname, 'mockUsers.json'), JSON.stringify(usersData, null, 2));

console.log('Node exécuté. Ouvrez /debug pour vérifier.');
