console.log('🔍 Testing Nodemailer Installation...');
console.log('📁 Current directory:', process.cwd());
console.log('📦 Node version:', process.version);

// Test 1: Basic import
console.log('\n1️⃣ Testing basic import...');
try {
  const nodemailer = require('nodemailer');
  console.log('✅ Nodemailer imported successfully');
  console.log('📧 Type:', typeof nodemailer);
  console.log('📧 Keys:', Object.keys(nodemailer).slice(0, 10));
  
  // Test 2: Check createTransporter
  console.log('\n2️⃣ Testing createTransporter...');
  console.log('📧 createTransporter type:', typeof nodemailer.createTransporter);
  
  if (typeof nodemailer.createTransporter === 'function') {
    console.log('✅ createTransporter is available');
    
    // Test 3: Create test transporter
    console.log('\n3️⃣ Testing transporter creation...');
    try {
      const testTransporter = nodemailer.createTransporter({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'testpass'
        }
      });
      console.log('✅ Test transporter created successfully');
      console.log('📧 Transporter type:', typeof testTransporter);
      console.log('📧 Transporter methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(testTransporter)).slice(0, 10));
      
      // Close transporter
      testTransporter.close();
      console.log('✅ Transporter closed successfully');
      
    } catch (transporterError) {
      console.error('❌ Transporter creation failed:', transporterError.message);
    }
    
  } else {
    console.error('❌ createTransporter is not a function');
    console.log('Available methods:', Object.keys(nodemailer));
  }
  
} catch (importError) {
  console.error('❌ Nodemailer import failed:', importError.message);
  console.error('Full error:', importError);
  
  // Test alternative imports
  console.log('\n🔄 Trying alternative imports...');
  try {
    const { createTransporter } = require('nodemailer');
    console.log('✅ Destructured import works');
  } catch (altError) {
    console.error('❌ Alternative import failed:', altError.message);
  }
}

// Test 4: Check package.json
console.log('\n4️⃣ Checking package.json...');
try {
  const packageJson = require('./package.json');
  const nodemailerVersion = packageJson.dependencies && packageJson.dependencies.nodemailer;
  console.log('📦 Nodemailer in package.json:', nodemailerVersion || 'NOT FOUND');
  
  if (!nodemailerVersion) {
    console.log('⚠️  Nodemailer not in package.json dependencies');
  }
} catch (packageError) {
  console.error('❌ Could not read package.json:', packageError.message);
}

// Test 5: Check node_modules
console.log('\n5️⃣ Checking node_modules...');
const fs = require('fs');
const path = require('path');

try {
  const nodemailerPath = path.join('node_modules', 'nodemailer');
  if (fs.existsSync(nodemailerPath)) {
    console.log('✅ Nodemailer folder exists in node_modules');
    
    const packageJsonPath = path.join(nodemailerPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const nodemailerPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log('📦 Installed version:', nodemailerPackage.version);
    }
  } else {
    console.error('❌ Nodemailer folder not found in node_modules');
  }
} catch (fsError) {
  console.error('❌ File system check failed:', fsError.message);
}

console.log('\n🎯 Test completed!');
console.log('\n📋 NEXT STEPS:');
if (typeof require('nodemailer').createTransporter === 'function') {
  console.log('✅ Nodemailer is working correctly');
  console.log('✅ You can now restart your server and try sending emails');
} else {
  console.log('❌ Nodemailer needs to be reinstalled');
  console.log('💡 Run these commands:');
  console.log('   npm uninstall nodemailer');
  console.log('   npm install nodemailer@6.9.7');
  console.log('   node test-nodemailer.js');
}