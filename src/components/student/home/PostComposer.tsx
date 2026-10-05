import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/ui/ThemedText';
import { showToast } from '@/ui/Toast';
import { haptics } from '@/lib/haptics';
import { createInstitutionPost, updateInstitutionPost, uploadPostMedia } from '@/lib/api/student';
import { useAuth } from '@/lib/auth/AuthContext';
import { initialsFromName } from '@/lib/format';
import type { PostMedia, PostScope, StudentFeedPost, StudentPostCategory } from '@/lib/types/student';

interface PostComposerProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (postId?: string) => void;
  defaultScope?: PostScope;
  courseId?: string;
  editingPost?: StudentFeedPost | null;
}
type PostFormat = 'text' | 'photo' | 'video' | 'document';

type CategoryOption = {
  id: StudentPostCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  fields?: { key: string; label: string; placeholder?: string; required?: boolean; inputType?: 'date' | 'time' | 'text' | 'url' }[];
};

const CATEGORIES: CategoryOption[] = [
  { id: 'general', label: 'General', icon: 'chatbubble-ellipses-outline' },
  {
    id: 'event',
    label: 'Event',
    icon: 'calendar-outline',
    fields: [
      { key: 'start_date', label: 'Start date', placeholder: 'Choose a date', required: true, inputType: 'date' },
      { key: 'start_time', label: 'Start time', placeholder: 'Choose a time', required: true, inputType: 'time' },
      { key: 'location', label: 'Location', placeholder: 'Main hall' },
    ],
  },
  { id: 'academic', label: 'Academic', icon: 'school-outline' },
  {
    id: 'achievement',
    label: 'Win',
    icon: 'trophy-outline',
    fields: [{ key: 'achievement_date', label: 'Date', placeholder: 'Choose a date', required: true, inputType: 'date' }],
  },
  {
    id: 'opportunity',
    label: 'Opportunity',
    icon: 'briefcase-outline',
    fields: [
      { key: 'application_deadline', label: 'Deadline', placeholder: 'Choose a date', required: true, inputType: 'date' },
      { key: 'external_link', label: 'Link', placeholder: 'https://...', inputType: 'url' },
    ],
  },
  { id: 'official_announcement', label: 'Official', icon: 'megaphone-outline' },
];

const LIBRARY: PostMedia[] = [
  {
    id: 'lib_campus',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80',
    label: 'Campus',
  },
  {
    id: 'lib_students',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80',
    label: 'Students',
  },
  {
    id: 'lib_library',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=80',
    label: 'Library',
  },
];

export function PostComposer({
  visible,
  onClose,
  onCreated,
  defaultScope = 'institution_wide',
  courseId,
  editingPost,
}: PostComposerProps) {
  const insets = useSafeAreaInsets();
  const { accessToken, currentMembership, user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<StudentPostCategory>('general');
  const [scope, setScope] = useState<PostScope>(courseId ? 'course_specific' : defaultScope);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [media, setMedia] = useState<PostMedia[]>([]);
  const [postFormat, setPostFormat] = useState<PostFormat>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [allowReactions, setAllowReactions] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [visibility, setVisibility] = useState<'institution' | 'students' | 'public'>('institution');
  const [commentAudience, setCommentAudience] = useState<'institution' | 'students'>('institution');
  const [reactionAudience, setReactionAudience] = useState<'institution' | 'students'>('institution');
  const [showMore, setShowMore] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pickerField, setPickerField] = useState<{ key: string; mode: 'date' | 'time' } | null>(null);

  const selectedCategory = useMemo(
    () => CATEGORIES.find((item) => item.id === category) ?? CATEGORIES[0],
    [category],
  );

  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e4e6eb';
  const surface = isDark ? '#1e293b' : '#ffffff';
  const bg = isDark ? '#0f172a' : '#f0f2f5';
  const text = isDark ? '#f8fafc' : '#050505';

  useEffect(() => {
    if (!visible) return;
    if (editingPost) {
      setTitle(editingPost.title); setBody(editingPost.body); setCategory(editingPost.category); setScope(editingPost.scope); setTags(editingPost.tags); setMedia(editingPost.media);
      setAllowReactions(editingPost.allow_reactions); setAllowComments(editingPost.allow_comments);
      setVisibility((editingPost.metadata.visibility as 'institution' | 'students' | 'public') ?? 'institution');
      setCommentAudience((editingPost.metadata.comment_audience as 'institution' | 'students') ?? 'institution');
      setReactionAudience((editingPost.metadata.reaction_audience as 'institution' | 'students') ?? 'institution');
      return;
    }
    setScope(courseId ? 'course_specific' : defaultScope);
  }, [visible, courseId, defaultScope, editingPost]);

  const reset = () => {
    setTitle('');
    setBody('');
    setCategory('general');
    setTags([]);
    setTagInput('');
    setMedia([]);
    setPostFormat('text');
    setMediaUrl('');
    setMetadata({});
    setAllowReactions(true);
    setAllowComments(true);
    setVisibility('institution');
    setCommentAudience('institution');
    setReactionAudience('institution');
    setShowMore(false);
  };

  const addTag = () => {
    const next = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (!next || tags.includes(next)) return;
    setTags((prev) => [...prev, next]);
    setTagInput('');
  };

  const openFieldPicker = (field: { key: string; inputType?: string }) => {
    if (field.inputType === 'date' || field.inputType === 'time') {
      setPickerField({ key: field.key, mode: field.inputType });
    }
  };

  const pickerValue = (key: string, mode: 'date' | 'time') => {
    const stored = metadata[key];
    if (stored) {
      const parsed = new Date(stored);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const value = new Date();
    if (mode === 'time') value.setMinutes(Math.ceil(value.getMinutes() / 5) * 5, 0, 0);
    return value;
  };

  const addMedia = (item: PostMedia) => {
    setMedia((prev) => {
      if (item.type === 'video') return [item];
      if (prev.some((m) => m.type === 'video')) return prev;
      if (prev.some((m) => m.id === item.id || m.url === item.url)) return prev;
      if (prev.filter((m) => m.type === 'image').length >= 4) return prev;
      return [...prev, item];
    });
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    console.log('[PostComposer] document selected', {
      name: result.assets[0]?.name,
      uriScheme: result.assets[0]?.uri.split(':')[0],
      mimeType: result.assets[0]?.mimeType,
      size: result.assets[0]?.size,
    });
    setPostFormat('document');
    const file = result.assets[0];
    addMedia({
      id: `local_${Date.now()}`,
      type: 'document',
      url: file.uri,
      label: file.name,
      file_name: file.name,
      mime_type: file.mimeType,
      file_size: file.size,
    });
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast.error('Photos', 'Permission is required to attach images');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: postFormat === 'video' ? ['videos'] : postFormat === 'photo' ? ['images'] : ['images', 'videos'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });
    if (result.canceled) return;
    const selectedType = result.assets[0]?.type === 'video' ? 'video' : 'photo';
    console.log('[PostComposer] media selected', result.assets.map((asset) => ({
      type: asset.type,
      uriScheme: asset.uri.split(':')[0],
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      size: asset.fileSize,
    })));
    setPostFormat(selectedType);
    result.assets.forEach((asset, index) => {
      addMedia({
        id: `local_${Date.now()}_${index}`,
        type: asset.type === 'video' ? 'video' : 'image',
        url: asset.uri,
        label: asset.fileName || 'Photo',
        file_name: asset.fileName || undefined,
        mime_type: asset.mimeType,
        file_size: asset.fileSize,
        file: asset.file,
      });
    });
  };

  const addUrlMedia = () => {
    const url = mediaUrl.trim();
    if (!url) return;
    const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
    const isDocument = /\.pdf(\?|$)/i.test(url);
    addMedia({
      id: `url_${Date.now()}`,
      type: isVideo ? 'video' : isDocument ? 'document' : 'image',
      url,
      label: 'Custom URL',
    });
    setMediaUrl('');
  };

  const validationError = useMemo(() => {
    if (!body.trim()) return 'Write something first';
    for (const field of selectedCategory.fields ?? []) {
      if (field.required && !metadata[field.key]?.trim()) {
        return `${field.label} is required for ${selectedCategory.label}`;
      }
    }
    return null;
  }, [body, metadata, selectedCategory]);

  const submit = async () => {
    if (!accessToken || !currentMembership) return;
    if (validationError) {
      showToast.error('Post', validationError);
      return;
    }
    setSubmitting(true);
    console.log('[PostComposer] submit started', {
      editing: Boolean(editingPost),
      category,
      format: postFormat,
      mediaCount: media.length,
      media: media.map((item) => ({ type: item.type, uriScheme: item.url.split(':')[0], fileName: item.file_name || item.label, mimeType: item.mime_type, size: item.file_size })),
      institutionId: currentMembership.institution_id,
    });
    try {
      const uploadedMedia = await Promise.all(media.map((item) => uploadPostMedia(item, accessToken)));
      console.log('[PostComposer] all media uploaded', uploadedMedia.map((item) => ({ type: item.type, url: item.url, label: item.label })));
      const input = {
        title: title.trim(), body: body.trim(), category, scope: courseId ? 'course_specific' : scope, course_id: courseId, tags, media: uploadedMedia,
        metadata: { ...metadata, visibility, comment_audience: commentAudience, reaction_audience: reactionAudience }, allow_reactions: allowReactions, allow_comments: allowComments, visibility, comment_audience: commentAudience, reaction_audience: reactionAudience,
      };
      if (editingPost) {
        await updateInstitutionPost(currentMembership.institution_id, editingPost.id, input, accessToken);
        showToast.success('Updated', 'Your post has been updated');
        onCreated?.();
      } else {
      console.log('[PostComposer] creating post', { institutionId: currentMembership.institution_id, mediaCount: input.media.length, category: input.category });
      const created = await createInstitutionPost(
        currentMembership.institution_id,
        input,
        accessToken,
      );
      haptics.success();
      showToast.success('Posted', category === 'official_announcement' ? 'Submitted for review' : 'Your post is live');
      reset();
      onCreated?.(created.id);
      }
      onClose();
    } catch (error) {
      console.error('[PostComposer] submit failed', error);
      showToast.error('Could not post', error instanceof Error ? error.message : 'Try again');
    } finally {
      setSubmitting(false);
    }
  };

  const formatOptions = [
    { value: 'text' as const, label: 'Text', subtitle: 'A quick update', icon: 'create-outline' as const, color: '#2563eb' },
    { value: 'photo' as const, label: 'Photo', subtitle: 'Show the moment', icon: 'images-outline' as const, color: '#16a34a' },
    { value: 'video' as const, label: 'Video', subtitle: 'Bring it to life', icon: 'videocam-outline' as const, color: '#db2777' },
    { value: 'document' as const, label: 'Document', subtitle: 'Share a resource', icon: 'document-text-outline' as const, color: '#ea580c' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}
      >
        <LinearGradient colors={isDark ? ['#111827', '#172554'] : ['#eff6ff', '#ffffff']} style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close composer" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? '#26334d' : '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={21} color={text} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <ThemedText variant="subheading" style={{ color: text, fontWeight: '800' }}>{editingPost ? 'Edit post' : 'Create something'}</ThemedText>
              <ThemedText variant="tiny" style={{ color: muted, marginTop: 2 }}>Share with your campus</ThemedText>
            </View>
            <TouchableOpacity onPress={() => void submit()} disabled={submitting} accessibilityRole="button" accessibilityLabel="Publish post" style={{ minWidth: 82, height: 40, borderRadius: 20, backgroundColor: submitting ? '#94a3b8' : '#2563eb', alignItems: 'center', justifyContent: 'center' }}>
              {submitting ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText variant="caption" style={{ color: '#ffffff', fontWeight: '800' }}>{editingPost ? 'Save' : 'Publish'}</ThemedText>}
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }}>
              <ThemedText variant="body" style={{ color: '#ffffff', fontWeight: '800' }}>{initialsFromName(user?.full_name || 'You')}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="body" style={{ color: text, fontWeight: '800' }}>{user?.full_name || 'You'}</ThemedText>
              <ThemedText variant="tiny" style={{ color: muted, marginTop: 3 }}>{currentMembership?.institution_name || 'Your campus'}</ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText variant="tiny" style={{ color: muted, marginBottom: 5 }}>Posting to</ThemedText>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {([
                  { id: 'institution_wide' as const, label: 'Campus', icon: 'business-outline' as const },
                  { id: 'course_specific' as const, label: 'Course', icon: 'book-outline' as const },
                ]).map((item) => {
                  const active = scope === item.id || (!!courseId && item.id === 'course_specific');
                  return <TouchableOpacity key={item.id} disabled={!!courseId} onPress={() => setScope(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, backgroundColor: active ? '#dbeafe' : (isDark ? '#26334d' : '#ffffff') }}><Ionicons name={item.icon} size={12} color={active ? '#2563eb' : muted} /><ThemedText variant="tiny" style={{ color: active ? '#2563eb' : muted, fontWeight: '700' }}>{item.label}</ThemedText></TouchableOpacity>;
                })}
              </View>
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 40, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View>
            <ThemedText variant="caption" style={{ color: muted, fontWeight: '800', letterSpacing: 0.8, marginBottom: 9 }}>CHOOSE A FORMAT</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {formatOptions.map((item) => {
                const active = postFormat === item.value;
                return <TouchableOpacity key={item.value} onPress={() => { setPostFormat(item.value); if (item.value === 'photo' || item.value === 'video') void pickPhoto(); if (item.value === 'document') void pickDocument(); }} style={{ width: 132, minHeight: 92, padding: 12, borderRadius: 18, backgroundColor: active ? item.color : surface, borderWidth: 1, borderColor: active ? item.color : border }}><View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: active ? 'rgba(255,255,255,0.22)' : `${item.color}18`, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={item.icon} size={19} color={active ? '#ffffff' : item.color} /></View><ThemedText variant="body" style={{ color: active ? '#ffffff' : text, fontWeight: '800', marginTop: 8 }}>{item.label}</ThemedText><ThemedText variant="tiny" style={{ color: active ? 'rgba(255,255,255,0.82)' : muted, marginTop: 2 }}>{item.subtitle}</ThemedText></TouchableOpacity>;
              })}
            </ScrollView>
          </View>

          <View style={{ backgroundColor: surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <ThemedText variant="body" style={{ color: text, fontWeight: '800' }}>{postFormat === 'photo' ? 'Set the scene' : postFormat === 'video' ? 'Tell the story' : postFormat === 'document' ? 'Add resource context' : 'Start your post'}</ThemedText>
              <Ionicons name={formatOptions.find((item) => item.value === postFormat)?.icon || 'create-outline'} size={20} color={formatOptions.find((item) => item.value === postFormat)?.color || '#2563eb'} />
            </View>
            <TextInput value={title} onChangeText={setTitle} placeholder={postFormat === 'document' ? 'Resource name (optional)' : 'Headline (optional)'} placeholderTextColor={muted} style={{ color: text, fontSize: 16, fontWeight: '800', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: border }} />
            <TextInput value={body} onChangeText={setBody} placeholder={postFormat === 'photo' ? 'What should people notice in this photo?' : postFormat === 'video' ? 'Add context for this video...' : postFormat === 'document' ? 'Who will find this document useful?' : `What's on your mind, ${user?.full_name?.split(' ')[0] || 'there'}?`} placeholderTextColor={muted} multiline textAlignVertical="top" style={{ color: text, fontSize: 17, minHeight: 132, lineHeight: 25, paddingTop: 14 }} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.map((item) => { const active = category === item.id; return <TouchableOpacity key={item.id} onPress={() => { haptics.selection(); setCategory(item.id); setMetadata({}); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: active ? '#2563eb' : surface, borderWidth: 1, borderColor: active ? '#2563eb' : border }}><Ionicons name={item.icon} size={14} color={active ? '#ffffff' : muted} /><ThemedText variant="tiny" style={{ color: active ? '#ffffff' : text, fontWeight: '700' }}>{item.label}</ThemedText></TouchableOpacity>; })}
          </ScrollView>

          {(selectedCategory.fields?.length ?? 0) > 0 ? (
            <View style={{ backgroundColor: surface, borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={selectedCategory.icon} size={16} color="#7c3aed" /></View>
                <View><ThemedText variant="body" style={{ color: text, fontWeight: '800' }}>{selectedCategory.label} details</ThemedText><ThemedText variant="tiny" style={{ color: muted, marginTop: 2 }}>Add useful context to your post</ThemedText></View>
              </View>
              {selectedCategory.fields!.map((field) => field.inputType === 'date' || field.inputType === 'time' ? (
                <TouchableOpacity key={field.key} onPress={() => openFieldPicker(field)} style={{ borderWidth: 1, borderColor: border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View><ThemedText variant="tiny" style={{ color: muted }}>{field.label}{field.required ? ' *' : ''}</ThemedText><ThemedText variant="body" style={{ color: metadata[field.key] ? text : muted, marginTop: 3 }}>{metadata[field.key] || field.placeholder}</ThemedText></View>
                  <Ionicons name={field.inputType === 'date' ? 'calendar-outline' : 'time-outline'} size={20} color="#7c3aed" />
                </TouchableOpacity>
              ) : (
                <TextInput key={field.key} value={metadata[field.key] || ''} onChangeText={(value) => setMetadata((prev) => ({ ...prev, [field.key]: value }))} placeholder={`${field.label}${field.required ? ' *' : ''}`} placeholderTextColor={muted} keyboardType={field.inputType === 'url' ? 'url' : 'default'} autoCapitalize={field.inputType === 'url' ? 'none' : 'sentences'} style={{ borderWidth: 1, borderColor: border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: text, backgroundColor: bg, fontSize: 15 }} />
              ))}
            </View>
          ) : null}

          {pickerField ? <DateTimePicker value={pickerValue(pickerField.key, pickerField.mode)} mode={pickerField.mode} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_event, value) => { if (value) { const formatted = pickerField.mode === 'date' ? value.toISOString().slice(0, 10) : value.toTimeString().slice(0, 5); setMetadata((prev) => ({ ...prev, [pickerField.key]: formatted })); } if (Platform.OS !== 'ios' || value) setPickerField(null); }} /> : null}

          {media.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {media.map((item) => (
                <View key={item.id || item.url} style={{ width: 156, height: 156, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: border, backgroundColor: surface }}>
                  {item.type === 'image' ? <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: item.type === 'video' ? '#111827' : '#fee2e2' }}><Ionicons name={item.type === 'video' ? 'play-circle-outline' : 'document-text-outline'} size={34} color={item.type === 'video' ? '#fff' : '#dc2626'} /><ThemedText variant="tiny" style={{ color: item.type === 'video' ? '#fff' : '#991b1b', marginTop: 4 }}>{item.type === 'video' ? 'Video' : 'PDF'}</ThemedText></View>}
                  <TouchableOpacity
                    onPress={() => setMedia((prev) => prev.filter((m) => m.url !== item.url))}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="close" size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={{ backgroundColor: surface, borderRadius: 20, padding: 16, gap: 14, borderWidth: 1, borderColor: border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View><ThemedText variant="body" style={{ color: text, fontWeight: '800' }}>Add finishing touches</ThemedText><ThemedText variant="tiny" style={{ color: muted, marginTop: 3 }}>Links, tags and interaction settings</ThemedText></View>
              <Ionicons name="sparkles-outline" size={20} color="#f59e0b" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {[
                {
                  label: 'Library',
                  icon: 'images-outline' as const,
                  color: '#f7b928',
                  onPress: () => addMedia(LIBRARY[Math.floor(Math.random() * LIBRARY.length)]),
                },
                {
                  label: showMore ? 'Hide settings' : 'Post settings',
                  icon: 'options-outline' as const,
                  color: '#1877f2',
                  onPress: () => setShowMore((v) => !v),
                },
              ].map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={action.onPress}
                  style={{ alignItems: 'center', gap: 4, minWidth: 72 }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={action.icon} size={20} color={action.color} />
                  </View>
                  <ThemedText variant="tiny" style={{ color: muted, fontWeight: '600' }}>
                    {action.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {showMore ? (
              <View style={{ gap: 12, paddingTop: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={mediaUrl}
                    onChangeText={setMediaUrl}
                    placeholder="Paste image, video, or PDF URL"
                    placeholderTextColor={muted}
                    autoCapitalize="none"
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: border,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      color: text,
                      backgroundColor: bg,
                    }}
                  />
                  <TouchableOpacity
                    onPress={addUrlMedia}
                    style={{
                      backgroundColor: '#1877f2',
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      justifyContent: 'center',
                    }}
                  >
                    <ThemedText variant="caption" style={{ color: '#ffffff', fontWeight: '700' }}>
                      Add
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="Add tag"
                    placeholderTextColor={muted}
                    onSubmitEditing={addTag}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: border,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      color: text,
                      backgroundColor: bg,
                    }}
                  />
                  <TouchableOpacity
                    onPress={addTag}
                    style={{
                      borderWidth: 1,
                      borderColor: border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      justifyContent: 'center',
                    }}
                  >
                    <ThemedText variant="caption" style={{ color: text, fontWeight: '700' }}>
                      Tag
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {tags.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {tags.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => setTags((prev) => prev.filter((item) => item !== tag))}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: isDark ? '#1e3a5f' : '#e7f3ff',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 14,
                        }}
                      >
                        <ThemedText variant="tiny" style={{ color: '#1877f2', fontWeight: '600' }}>
                          #{tag}
                        </ThemedText>
                        <Ionicons name="close" size={12} color="#1877f2" />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                <View style={{ backgroundColor: bg, borderRadius: 16, padding: 12, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><ThemedText variant="body" style={{ color: text, fontWeight: '700' }}>Allow reactions</ThemedText><ThemedText variant="tiny" style={{ color: muted }}>People can like this post</ThemedText></View><Switch value={allowReactions} onValueChange={setAllowReactions} /></View>
                  <View style={{ height: 1, backgroundColor: border }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><ThemedText variant="body" style={{ color: text, fontWeight: '700' }}>Allow comments</ThemedText><ThemedText variant="tiny" style={{ color: muted }}>People can reply to this post</ThemedText></View><Switch value={allowComments} onValueChange={setAllowComments} /></View>
                </View>
                <ThemedText variant="caption" style={{ color: muted, fontWeight: '800', letterSpacing: 0.7 }}>VISIBILITY</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {([
                    ['institution', 'All institute members'],
                    ['students', 'Students only'],
                    ['public', 'Everyone'],
                  ] as const).map(([value, label]) => (
                    <TouchableOpacity key={value} onPress={() => setVisibility(value)} style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: visibility === value ? '#2563eb' : bg, borderWidth: 1, borderColor: visibility === value ? '#2563eb' : border, alignItems: 'center' }}>
                      <ThemedText variant="tiny" style={{ color: visibility === value ? '#fff' : text, fontWeight: '700', textAlign: 'center' }}>{label}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity onPress={() => setCommentAudience((value) => value === 'institution' ? 'students' : 'institution')} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <ThemedText variant="body" style={{ color: text, fontWeight: '700' }}>Comments</ThemedText><ThemedText variant="body" style={{ color: '#2563eb', fontWeight: '700' }}>{commentAudience === 'students' ? 'Students only' : 'All members'} ›</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setReactionAudience((value) => value === 'institution' ? 'students' : 'institution')} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <ThemedText variant="body" style={{ color: text, fontWeight: '700' }}>Reactions</ThemedText><ThemedText variant="body" style={{ color: '#2563eb', fontWeight: '700' }}>{reactionAudience === 'students' ? 'Students only' : 'All members'} ›</ThemedText>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
