#!/usr/bin/env node
/**
 * 배포 전 검증 스크립트
 * lint → type-check → format:check → test → build 순서로 실행
 * 실패 시 해당 단계명과 에러를 명확히 출력
 */
const { spawnSync } = require('child_process');

const steps = [
  { name: 'Lint', cmd: 'npm', args: ['run', 'lint'] },
  { name: 'Type-check', cmd: 'npm', args: ['run', 'type-check'] },
  { name: 'Format check', cmd: 'npm', args: ['run', 'format:check'] },
  { name: 'Test', cmd: 'npm', args: ['run', 'test:ci'] },
  { name: 'Build', cmd: 'npm', args: ['run', 'build'] },
];

const total = steps.length;
for (let i = 0; i < steps.length; i++) {
  const { name, cmd, args } = steps[i];
  console.log(`\n${'='.repeat(60)}`);
  console.log(`>> [${i + 1}/${total}] ${name}`);
  console.log('='.repeat(60) + '\n');

  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`\n${'!'.repeat(60)}`);
    console.error(`[VERIFY FAILED] Step "${name}" failed with exit code ${result.status}`);
    console.error('='.repeat(60));
    process.exit(result.status ?? 1);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('>> All checks passed. Ready for deployment.');
console.log('='.repeat(60) + '\n');
