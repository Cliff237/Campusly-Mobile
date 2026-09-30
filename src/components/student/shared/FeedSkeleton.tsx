import { View } from 'react-native';

export function FeedSkeleton() {
  return (
    <View className="px-5 pt-2">
      {[0, 1, 2].map((item) => (
        <View
          key={item}
          className="mb-4 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-4"
        >
          <View className="h-3 w-32 rounded bg-surface-hover dark:bg-surface-hover-dark mb-3" />
          <View className="h-5 w-3/4 rounded bg-surface-hover dark:bg-surface-hover-dark mb-2" />
          <View className="h-4 w-full rounded bg-surface-hover dark:bg-surface-hover-dark mb-2" />
          <View className="h-4 w-2/3 rounded bg-surface-hover dark:bg-surface-hover-dark mb-4" />
          <View className="h-32 w-full rounded-xl bg-surface-hover dark:bg-surface-hover-dark" />
        </View>
      ))}
    </View>
  );
}
