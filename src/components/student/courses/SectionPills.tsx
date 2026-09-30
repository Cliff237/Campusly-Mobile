import { ScrollView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/ui/ThemedText';
import { haptics } from '@/lib/haptics';

export type CourseSection = 'feed' | 'materials' | 'assignments' | 'grades' | 'attendance';

const SECTIONS: { id: CourseSection; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'materials', label: 'Materials' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'grades', label: 'Grades' },
  { id: 'attendance', label: 'Attendance' },
];

interface SectionPillsProps {
  value: CourseSection;
  onChange: (value: CourseSection) => void;
}

export function SectionPills({ value, onChange }: SectionPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 12 }}
    >
      {SECTIONS.map((section) => {
        const active = section.id === value;
        return (
          <TouchableOpacity
            key={section.id}
            accessibilityRole="button"
            accessibilityLabel={section.label}
            onPress={() => {
              haptics.selection();
              onChange(section.id);
            }}
            className={`px-4 py-2 rounded-full border ${
              active
                ? 'bg-accent-start border-accent-start'
                : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
            }`}
          >
            <ThemedText variant="caption" className={active ? 'text-white font-semibold' : 'text-text dark:text-text-dark'}>
              {section.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
