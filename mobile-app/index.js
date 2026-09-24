/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerLiveLocationService } from './src/native/liveLocation';
import { registerBackgroundHandlers } from './src/native/push';

// Must be registered at startup (before any UI) so background pushes and the live-location foreground
// service work when the app is not in the foreground.
registerBackgroundHandlers();
registerLiveLocationService();

AppRegistry.registerComponent(appName, () => App);
