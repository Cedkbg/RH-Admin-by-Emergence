import { localUsersService } from '../local_users';

async function seedUsers() {
  // RH Admin principal
  const rhPw = 'rh2024!Emergence';
  await localUsersService.create({
    username: 'rhadmin',
    fullName: 'Administrateur RH Emergence',
    role: 'rh' as const,
    pw: rhPw
  });

  // Agents exemples
  const agentPw = 'agent123!';
  const agents = [
    { username: 'agent1', fullName: 'Agent 1 Joy', role: 'agent' as const },
    { username: 'agent2', fullName: 'Agent 2 Forge', role: 'agent' as const },
    { username: 'agent3', fullName: 'Agent 3 People', role: 'agent' as const },
  ];

  for (const data of agents) {
    await localUsersService.create({ ...data, pw: agentPw });
  }

  console.log(`✅ Seeded:
- RH: rhadmin / ${rhPw}
- Agents (${agents.length}): ${agentPw}`);
}

// Run if direct
if (import.meta.url === `file://${Bun.main}`) {
  seedUsers().catch(console.error);
}

export { seedUsers };

