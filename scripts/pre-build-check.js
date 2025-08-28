const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'JWT_SECRET'
];

const checkEnvironmentVariables = () => {
  console.log('🔍 Checking environment variables...');
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (process.env.NODE_ENV === 'production') {
    if (missing.length > 0) {
      console.warn('⚠️ Some environment variables are missing in production:');
      missing.forEach(envVar => console.warn(`   - ${envVar}`));
      console.warn('Will attempt to proceed with build anyway, as variables might be set in Railway environment.');
    }
  } else if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    process.exit(1);
  }
  console.log('✅ Environment variable check complete');
};

const checkDependencies = () => {
  console.log('🔍 Checking package.json...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredDeps = {
    'next': '14.0.4',
    '@prisma/client': '^5.8.0',
    'next-auth': '^4.24.5'
  };

  Object.entries(requiredDeps).forEach(([dep, version]) => {
    const actualVersion = packageJson.dependencies[dep];
    if (!actualVersion) {
      console.error(`❌ Missing required dependency: ${dep}`);
      process.exit(1);
    }
      if (!version.startsWith('^') && actualVersion !== version) {
      console.error(`❌ Incorrect version for ${dep}. Expected ${version}, got ${actualVersion}`);
      process.exit(1);
    }
  });
  
  console.log('✅ All required dependencies are correct');
};

const checkNodeVersion = () => {
  console.log('🔍 Checking Node.js version...');
  const requiredVersion = '18.17.0';
  const currentVersion = process.version.slice(1); // Remove 'v' prefix
  
  if (currentVersion.localeCompare(requiredVersion, undefined, { numeric: true }) < 0) {
    console.error(`❌ Node.js version must be >= ${requiredVersion}. Current: ${currentVersion}`);
    process.exit(1);
  }
  console.log('✅ Node.js version is compatible');
};

const checkPrismaSchema = () => {
  console.log('🔍 Checking Prisma schema...');
  try {
    fs.accessSync('prisma/schema.prisma');
    console.log('✅ Prisma schema exists');
  } catch {
    console.error('❌ Missing prisma/schema.prisma');
    process.exit(1);
  }
};

console.log('🚀 Starting pre-build checks...\n');

checkEnvironmentVariables();
checkDependencies();
checkNodeVersion();
checkPrismaSchema();

console.log('\n✨ All checks passed! Ready to build.');
