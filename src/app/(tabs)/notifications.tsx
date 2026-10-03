import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { EmptyState } from '@/ui/EmptyState';
import { ScreenHero } from '@/ui/ScreenHero';
import { useAppTheme } from '@/ui/useAppTheme';

export default function NotificationsScreen() {
	const { colors } = useAppTheme();

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<StatusBar style="light" />
			<ScreenHero title="Alerts" />
			<View style={{ flex: 1, justifyContent: 'center', paddingBottom: 48 }}>
				<EmptyState
					icon="notifications-outline"
					title="No alerts yet"
					message="Your campus updates and notifications will appear here."
				/>
			</View>
		</View>
	);
}
