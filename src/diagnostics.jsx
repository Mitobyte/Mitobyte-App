/**
 * Component Import Diagnostics
 * This file systematically checks all component imports to identify React error #300
 * (Invalid element type - undefined/wrong export)
 */

console.log('🔍 Starting Component Import Diagnostics...\n');

// Test all imports from App.jsx one by one
const imports = {
  // UI Components
  Button: null,

  // Main Components
  CommunityHub: null,
  QRScannerHub: null,
  AdminDashboard: null,
  EventsList: null,
  CheckInConfirmation: null,
  ProfileEditPage: null,
  PublicProfileView: null,
  SettingsPage: null,
  PWAInstallButton: null,
  OnboardingFlow: null,

  // Providers
  CrossmintProviders: null,
};

// Test Button (ui component)
try {
  const { Button } = await import('./components/ui/button');
  imports.Button = Button;
  console.log('✅ Button imported successfully', typeof Button);
} catch (error) {
  console.error('❌ Button import failed:', error.message);
}

// Test CommunityHub
try {
  const CommunityHub = (await import('./components/CommunityHub')).default;
  imports.CommunityHub = CommunityHub;
  console.log('✅ CommunityHub imported successfully', typeof CommunityHub);
} catch (error) {
  console.error('❌ CommunityHub import failed:', error.message);
}

// Test QRScannerHub
try {
  const QRScannerHub = (await import('./components/QRScannerHub')).default;
  imports.QRScannerHub = QRScannerHub;
  console.log('✅ QRScannerHub imported successfully', typeof QRScannerHub);
} catch (error) {
  console.error('❌ QRScannerHub import failed:', error.message);
}

// Test AdminDashboard
try {
  const AdminDashboard = (await import('./components/AdminDashboard')).default;
  imports.AdminDashboard = AdminDashboard;
  console.log('✅ AdminDashboard imported successfully', typeof AdminDashboard);
} catch (error) {
  console.error('❌ AdminDashboard import failed:', error.message);
}

// Test EventsList
try {
  const EventsList = (await import('./components/EventsList')).default;
  imports.EventsList = EventsList;
  console.log('✅ EventsList imported successfully', typeof EventsList);
} catch (error) {
  console.error('❌ EventsList import failed:', error.message);
}

// Test CheckInConfirmation
try {
  const CheckInConfirmation = (await import('./components/CheckInConfirmation')).default;
  imports.CheckInConfirmation = CheckInConfirmation;
  console.log('✅ CheckInConfirmation imported successfully', typeof CheckInConfirmation);
} catch (error) {
  console.error('❌ CheckInConfirmation import failed:', error.message);
}

// Test ProfileEditPage
try {
  const ProfileEditPage = (await import('./components/ProfileEditPage')).default;
  imports.ProfileEditPage = ProfileEditPage;
  console.log('✅ ProfileEditPage imported successfully', typeof ProfileEditPage);
} catch (error) {
  console.error('❌ ProfileEditPage import failed:', error.message);
}

// Test PublicProfileView
try {
  const PublicProfileView = (await import('./components/PublicProfileView')).default;
  imports.PublicProfileView = PublicProfileView;
  console.log('✅ PublicProfileView imported successfully', typeof PublicProfileView);
} catch (error) {
  console.error('❌ PublicProfileView import failed:', error.message);
}

// Test SettingsPage
try {
  const SettingsPage = (await import('./components/SettingsPage')).default;
  imports.SettingsPage = SettingsPage;
  console.log('✅ SettingsPage imported successfully', typeof SettingsPage);
} catch (error) {
  console.error('❌ SettingsPage import failed:', error.message);
}

// Test PWAInstallButton
try {
  const PWAInstallButton = (await import('./components/PWAInstallButton')).default;
  imports.PWAInstallButton = PWAInstallButton;
  console.log('✅ PWAInstallButton imported successfully', typeof PWAInstallButton);
} catch (error) {
  console.error('❌ PWAInstallButton import failed:', error.message);
}

// Test OnboardingFlow (named export!)
try {
  const { OnboardingFlow } = await import('./components/OnboardingFlow');
  imports.OnboardingFlow = OnboardingFlow;
  console.log('✅ OnboardingFlow imported successfully', typeof OnboardingFlow);
} catch (error) {
  console.error('❌ OnboardingFlow import failed:', error.message);
}

// Test CrossmintProviders (named export!)
try {
  const { CrossmintProviders } = await import('./providers/CrossmintProviders.jsx');
  imports.CrossmintProviders = CrossmintProviders;
  console.log('✅ CrossmintProviders imported successfully', typeof CrossmintProviders);
} catch (error) {
  console.error('❌ CrossmintProviders import failed:', error.message);
}

// Test CommunityHub's dependencies
console.log('\n🔍 Testing CommunityHub dependencies...\n');

try {
  const { EventsPage } = await import('./components/events/EventsPage');
  console.log('✅ EventsPage imported successfully', typeof EventsPage);
} catch (error) {
  console.error('❌ EventsPage import failed:', error.message);
}

try {
  const { MemberDirectory } = await import('./components/community/MemberDirectory');
  console.log('✅ MemberDirectory imported successfully', typeof MemberDirectory);
} catch (error) {
  console.error('❌ MemberDirectory import failed:', error.message);
}

try {
  const { UserProfileRedesigned } = await import('./components/social/UserProfileRedesigned');
  console.log('✅ UserProfileRedesigned imported successfully', typeof UserProfileRedesigned);
} catch (error) {
  console.error('❌ UserProfileRedesigned import failed:', error.message);
}

try {
  const CodeCoffeeRoom = (await import('./components/CodeCoffeeRoom')).default;
  console.log('✅ CodeCoffeeRoom imported successfully', typeof CodeCoffeeRoom);
} catch (error) {
  console.error('❌ CodeCoffeeRoom import failed:', error.message);
}

try {
  const BottomNav = (await import('./components/BottomNav')).default;
  console.log('✅ BottomNav imported successfully', typeof BottomNav);
} catch (error) {
  console.error('❌ BottomNav import failed:', error.message);
}

// Summary
console.log('\n📊 DIAGNOSTIC SUMMARY\n');
console.log('='.repeat(50));

let failedImports = [];
let undefinedImports = [];

for (const [name, component] of Object.entries(imports)) {
  if (component === null) {
    failedImports.push(name);
  } else if (component === undefined) {
    undefinedImports.push(name);
  }
}

if (failedImports.length > 0) {
  console.error('❌ FAILED IMPORTS:', failedImports.join(', '));
}

if (undefinedImports.length > 0) {
  console.error('⚠️  UNDEFINED IMPORTS (likely cause of error #300):', undefinedImports.join(', '));
}

if (failedImports.length === 0 && undefinedImports.length === 0) {
  console.log('✅ All imports successful!');
  console.log('\n🔍 The issue may be in nested component dependencies.');
  console.log('Check components used inside CommunityHub, OnboardingFlow, etc.');
}

export default imports;
