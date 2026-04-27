import { localUsersService, DEFAULT_RH_PASSWORD, DEFAULT_AGENT_PASSWORD } from '../local_users';

async function seedUsers() {
  // RH Admin principal
  await localUsersService.create({
    username: 'rhadmin',
    fullName: 'Administrateur RH Emergence',
    role: 'rh' as const,
    password: DEFAULT_RH_PASSWORD
  });

  // Agents exemples
  const agents = [
    { username: 'agent1', fullName: 'Agent 1 Joy', role: 'agent' as const },
    { username: 'agent2', fullName: 'Agent 2 Forge', role: 'agent' as const },
    { username: 'agent3', fullName: 'Agent 3 People', role: 'agent' as const },
  ];

  for (const data of agents) {
    await localUsersService.create({ ...data, password: DEFAULT_AGENT_PASSWORD });
  }

  console.log(`✅ Seeded:
- RH: rhadmin / ${DEFAULT_RH_PASSWORD}
- Agents (${agents.length}): ${DEFAULT_AGENT_PASSWORD}`);
}

export { seedUsers };

