export interface ScheduleBlock {
  id: string;
  time: string;
  type: 'deep_work' | 'break' | 'meeting' | 'productivity' | 'insight';
  label: string;
  title: string;
  description: string;
  duration?: string;
  tag?: string;
  tagType?: 'primary' | 'secondary' | 'tertiary';
}
