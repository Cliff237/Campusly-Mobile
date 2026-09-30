import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/ui/ThemedText';

export default function NotificationsScreen() {
	return (
		<SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
			<View className="px-5 pt-6">
				<ThemedText variant="display">Alerts</ThemedText>
				<ThemedText variant="muted" className="mt-2">
					Your campus updates and notifications will appear here.
				</ThemedText>
			</View>
		</SafeAreaView>
	);
}
