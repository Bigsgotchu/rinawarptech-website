#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Environment configurations
const envConfigs = {
  development: {
    DATABASE_URL: "postgresql://rinawarp_admin:rinawarp2024secure@rinawarp-dev-db.cv068iskk11z.us-west-2.rds.amazonaws.com:5432/rinawarp",
    NODE_ENV: "development"
  },
  staging: {
    DATABASE_URL: "postgresql://rinawarp_admin:rinawarp2024secure@rinawarp-staging-db.cv068iskk11z.us-west-2.rds.amazonaws.com:5432/rinawarp",
    NODE_ENV: "staging"
  },
  production: {
    DATABASE_URL: "postgresql://rinawarp_admin:rinawarp2024secure@rinawarp-prod-db.cv068iskk11z.us-west-2.rds.amazonaws.com:5432/rinawarp",
    NODE_ENV: "production"
  }
};

// Required variables for all environments
const requiredVars = {
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
    description: "Stripe publishable key (starts with pk_)",
    validate: (value) => value.startsWith('pk_')
  },
  STRIPE_SECRET_KEY: {
    description: "Stripe secret key (starts with sk_)",
    validate: (value) => value.startsWith('sk_')
  },
  STRIPE_WEBHOOK_SECRET: {
    description: "Stripe webhook signing secret (starts with whsec_)",
    validate: (value) => value.startsWith('whsec_')
  },
  JWT_SECRET: {
    description: "JWT signing secret (min 32 chars)",
    validate: (value) => value.length >= 32,
    default: () => crypto.randomBytes(32).toString('hex')
  }
};

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function generateEnvFile(environment) {
  const envPath = path.join(process.cwd(), environment === 'development' ? '.env' : `.env.${environment}`);
  const envVars = { ...envConfigs[environment] };

  console.log(`\n🔧 Configuring ${environment} environment variables...\n`);

  for (const [key, config] of Object.entries(requiredVars)) {
    let value;
    if (config.default) {
      const useDefault = await question(`Generate ${key} automatically? (Y/n): `);
      if (useDefault.toLowerCase() !== 'n') {
        value = config.default();
        console.log(`Generated ${key}: ${value}`);
      }
    }
    
    if (!value) {
      while (true) {
        value = await question(`Enter ${key} (${config.description}): `);
        if (config.validate(value)) {
          break;
        }
        console.log(`❌ Invalid value for ${key}. ${config.description}`);
      }
    }
    envVars[key] = value;
  }

  // Generate the env file content
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n');

  // Write the env file
  fs.writeFileSync(envPath, envContent + '\n');
  console.log(`\n✅ Environment file created at ${envPath}`);
}

async function main() {
  console.log('🚀 Environment Configuration Tool\n');
  
  const environments = ['development', 'staging', 'production'];
  const envList = environments.map((env, i) => `${i + 1}) ${env}`).join('\n');
  
  while (true) {
    console.log(`Select environment to configure:\n${envList}\n0) Exit\n`);
    const choice = await question('Choice: ');
    
    if (choice === '0') break;
    
    const envIndex = parseInt(choice) - 1;
    if (envIndex >= 0 && envIndex < environments.length) {
      await generateEnvFile(environments[envIndex]);
      
      const configureAnother = await question('\nConfigure another environment? (y/N): ');
      if (configureAnother.toLowerCase() !== 'y') break;
    } else {
      console.log('❌ Invalid choice. Please try again.\n');
    }
  }

  rl.close();
}

main().catch(console.error);
