import { supabase } from "./supabase";

export type EventSong = {
  id: string;
  timelineEventId: string;
  moment: string;
  songName: string;
  artist?: string;
  link?: string;
  orderIndex: number;
};

export type CreateEventSongInput = {
  moment: string;
  songName: string;
  artist?: string;
  link?: string;
};

export type UpdateEventSongInput = Partial<CreateEventSongInput>;

export const SONG_MOMENT_PRESETS = [
  "Bride Entry",
  "Groom Entry",
  "First Dance",
  "Sangeet Performance",
  "Baraat",
] as const;

type EventSongRow = {
  id: string;
  timeline_event_id: string;
  moment: string;
  song_name: string;
  artist: string | null;
  link: string | null;
  order_index: number;
};

function mapEventSong(row: EventSongRow): EventSong {
  return {
    id: row.id,
    timelineEventId: row.timeline_event_id,
    moment: row.moment,
    songName: row.song_name,
    artist: row.artist ?? undefined,
    link: row.link ?? undefined,
    orderIndex: row.order_index,
  };
}

export async function fetchEventSongs(timelineEventId: string): Promise<EventSong[]> {
  const { data, error } = await supabase
    .from("event_songs")
    .select("*")
    .eq("timeline_event_id", timelineEventId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapEventSong(row as EventSongRow));
}

/** All songs for a wedding's timeline events (flat list). */
export async function fetchSongsForEvents(timelineEventIds: string[]): Promise<EventSong[]> {
  if (timelineEventIds.length === 0) return [];
  const { data, error } = await supabase
    .from("event_songs")
    .select("*")
    .in("timeline_event_id", timelineEventIds)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapEventSong(row as EventSongRow));
}

export async function insertEventSong(
  timelineEventId: string,
  input: CreateEventSongInput,
): Promise<EventSong> {
  const existing = await fetchEventSongs(timelineEventId);
  const sameMoment = existing.filter((s) => s.moment === input.moment.trim());
  const orderIndex =
    sameMoment.length > 0
      ? Math.max(...sameMoment.map((s) => s.orderIndex)) + 1
      : existing.length > 0
        ? Math.max(...existing.map((s) => s.orderIndex)) + 1
        : 0;

  const { data, error } = await supabase
    .from("event_songs")
    .insert({
      timeline_event_id: timelineEventId,
      moment: input.moment.trim(),
      song_name: input.songName.trim(),
      artist: input.artist?.trim() || null,
      link: input.link?.trim() || null,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) throw error;
  return mapEventSong(data as EventSongRow);
}

export async function updateEventSong(id: string, patch: UpdateEventSongInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.moment !== undefined) payload.moment = patch.moment.trim();
  if (patch.songName !== undefined) payload.song_name = patch.songName.trim();
  if (patch.artist !== undefined) payload.artist = patch.artist?.trim() || null;
  if (patch.link !== undefined) payload.link = patch.link?.trim() || null;

  const { error } = await supabase.from("event_songs").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteEventSong(id: string): Promise<void> {
  const { error } = await supabase.from("event_songs").delete().eq("id", id);
  if (error) throw error;
}

export function groupSongsByMoment(songs: EventSong[]): { moment: string; songs: EventSong[] }[] {
  const map = new Map<string, EventSong[]>();
  for (const song of songs) {
    const list = map.get(song.moment) ?? [];
    list.push(song);
    map.set(song.moment, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id));
  }
  return [...map.entries()].map(([moment, groupSongs]) => ({ moment, songs: groupSongs }));
}
