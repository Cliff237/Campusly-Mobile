export function extractAward(post: { title?: string; body: string; metadata?: Record<string, unknown> }): string | null {
  if (post.metadata?.award && typeof post.metadata.award === 'string') {
    return post.metadata.award;
  }
  const text = `${post.title || ''} ${post.body}`;
  const match = text.match(/(\d{1,3}(?:[,\s.]\d{3})*(?:\.\d+)?\s*(?:FCFA|XAF|USD|\$|EUR|€|GBP|£|XOF))/i);
  return match ? match[1].trim() : null;
}

export function parseDateInfo(dateStr?: string | null): {
  month: string;
  day: string;
  weekday: string;
  formatted: string;
  daysRemainingText: string;
  isPast: boolean;
  progressPercent: number;
} {
  if (!dateStr) {
    const fallback = new Date();
    return {
      month: fallback.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: String(fallback.getDate()),
      weekday: fallback.toLocaleDateString('en-US', { weekday: 'short' }),
      formatted: fallback.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      daysRemainingText: 'Active',
      isPast: false,
      progressPercent: 65,
    };
  }

  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) {
    return {
      month: 'DATE',
      day: '--',
      weekday: '',
      formatted: dateStr,
      daysRemainingText: 'Active',
      isPast: false,
      progressPercent: 50,
    };
  }

  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let daysRemainingText = '';
  let isPast = false;
  let progressPercent = 70;

  if (diffDays < 0) {
    daysRemainingText = 'Ended';
    isPast = true;
    progressPercent = 100;
  } else if (diffDays === 0) {
    daysRemainingText = 'Ends today';
    progressPercent = 95;
  } else if (diffDays === 1) {
    daysRemainingText = 'Tomorrow';
    progressPercent = 90;
  } else if (diffDays <= 7) {
    daysRemainingText = `${diffDays} days left`;
    progressPercent = Math.max(20, Math.min(90, (1 - diffDays / 14) * 100));
  } else {
    daysRemainingText = `In ${diffDays} days`;
    progressPercent = Math.max(15, Math.min(60, (1 - diffDays / 30) * 100));
  }

  return {
    month: targetDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(targetDate.getDate()),
    weekday: targetDate.toLocaleDateString('en-US', { weekday: 'short' }),
    formatted: targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    daysRemainingText,
    isPast,
    progressPercent,
  };
}

export function extractBullets(body: string): { mainText: string; bullets: string[] } {
  const lines = body.split('\n');
  const bullets: string[] = [];
  const normalLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      bullets.push(trimmed.replace(/^[•\-*]\s*/, ''));
    } else {
      normalLines.push(line);
    }
  }

  return {
    mainText: normalLines.join('\n').trim(),
    bullets,
  };
}
