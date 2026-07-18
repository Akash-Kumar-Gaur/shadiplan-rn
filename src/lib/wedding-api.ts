import { supabase } from "./supabase";

export type PlanningTask = {
  id: string;
  task: string;
  leadTime: string;
  category: string;
  done: boolean;
  commonlyMissed: boolean;
  reason?: string;
  suggestedDate: string;
  eventTime?: string;
  venue?: string;
};

export type TimelineEvent = {
  id: string;
  eventDate: string;
  time: string;
  name: string;
  venue: string;
  dressCode: string;
  done: boolean;
};

export type CreateTimelineEventInput = {
  eventDate: string;
  time: string;
  name: string;
  venue?: string;
  dressCode?: string;
};

export type PendingSuggestion = {
  id: string;
  poolItemId: string;
  task: string;
  category: string;
  leadTime: string;
  commonlyMissed: boolean;
  suggestedDate: string;
  status: "pending" | "dismissed";
  batchNonce: number;
};

export type Wedding = {
  id: string;
  ownerId: string;
  coupleNames: string;
  location: string;
  startDate: string;
  date: string;
  endDate: string;
  totalBudget: number | null;
};

type WeddingRow = {
  id: string;
  owner_id: string;
  couple_names: string;
  location: string | null;
  start_date: string;
  wedding_date: string;
  end_date: string;
  total_budget: number | null;
};

type PlanningTaskRow = {
  id: string;
  wedding_id: string;
  task: string;
  lead_time: string;
  category: string;
  commonly_missed: boolean;
  reason: string | null;
  done: boolean;
  suggested_date: string | null;
  event_time: string | null;
  venue: string | null;
};

type PendingSuggestionRow = {
  id: string;
  wedding_id: string;
  pool_item_id: string;
  task: string;
  category: string;
  lead_time: string;
  commonly_missed: boolean;
  suggested_date: string | null;
  status: string;
  batch_nonce: number;
};

function mapWedding(row: WeddingRow): Wedding {
  return {
    id: row.id,
    ownerId: row.owner_id,
    coupleNames: row.couple_names,
    location: row.location ?? "",
    startDate: row.start_date ?? row.wedding_date,
    date: row.wedding_date,
    endDate: row.end_date ?? row.wedding_date,
    totalBudget: row.total_budget != null ? Number(row.total_budget) : null,
  };
}

function mapPlanningTask(row: PlanningTaskRow): PlanningTask {
  return {
    id: row.id,
    task: row.task,
    leadTime: row.lead_time,
    category: row.category,
    commonlyMissed: row.commonly_missed,
    reason: row.reason ?? undefined,
    done: row.done,
    suggestedDate: row.suggested_date ?? "",
    eventTime: row.event_time ?? undefined,
    venue: row.venue ?? undefined,
  };
}

function mapPendingSuggestion(row: PendingSuggestionRow): PendingSuggestion {
  return {
    id: row.id,
    poolItemId: row.pool_item_id,
    task: row.task,
    category: row.category,
    leadTime: row.lead_time,
    commonlyMissed: row.commonly_missed,
    suggestedDate: row.suggested_date ?? "",
    status: row.status === "dismissed" ? "dismissed" : "pending",
    batchNonce: row.batch_nonce,
  };
}

export async function resolveUserWedding(
  userId: string,
  userEmail: string,
): Promise<Wedding | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session?.user) {
    throw new Error("Not authenticated");
  }

  // Validate token with the server — local session can look fine while RLS sees nothing
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error(userError?.message ?? "Session expired — sign in again");
  }

  const normalizedEmail = userEmail.trim().toLowerCase();

  const { data: owned, error: ownedError } = await supabase
    .from("weddings")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (ownedError) throw ownedError;
  if (owned) return mapWedding(owned as WeddingRow);

  const { data: pending, error: pendingError } = await supabase
    .from("wedding_collaborators")
    .select("id, wedding_id")
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();
  if (pendingError) throw pendingError;

  if (pending) {
    const { error: acceptError } = await supabase
      .from("wedding_collaborators")
      .update({
        user_id: userId,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", pending.id);
    if (acceptError) throw acceptError;

    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .select("*")
      .eq("id", pending.wedding_id)
      .single();
    if (weddingError) throw weddingError;
    return mapWedding(wedding as WeddingRow);
  }

  const { data: membership, error: memberError } = await supabase
    .from("wedding_collaborators")
    .select("wedding_id")
    .eq("user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();
  if (memberError) throw memberError;
  if (membership) {
    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .select("*")
      .eq("id", membership.wedding_id)
      .single();
    if (weddingError) throw weddingError;
    return mapWedding(wedding as WeddingRow);
  }

  return null;
}

export async function updateWedding(
  weddingId: string,
  patch: Partial<{
    coupleNames: string;
    location: string;
    startDate: string;
    date: string;
    endDate: string;
    totalBudget: number | null;
  }>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.coupleNames !== undefined) payload.couple_names = patch.coupleNames.trim();
  if (patch.location !== undefined) payload.location = patch.location.trim();
  if (patch.startDate !== undefined) payload.start_date = patch.startDate;
  if (patch.date !== undefined) payload.wedding_date = patch.date;
  if (patch.endDate !== undefined) payload.end_date = patch.endDate;
  if (patch.totalBudget !== undefined) payload.total_budget = patch.totalBudget;
  if (!Object.keys(payload).length) return;
  const { error } = await supabase.from("weddings").update(payload).eq("id", weddingId);
  if (error) throw error;
}

export type WeddingCollaborator = {
  id: string;
  weddingId: string;
  email: string;
  userId: string | null;
  status: "pending" | "accepted";
  invitedAt: string;
  acceptedAt: string | null;
};

type CollaboratorRow = {
  id: string;
  wedding_id: string;
  email: string;
  user_id: string | null;
  status: string;
  invited_at: string;
  accepted_at: string | null;
};

function mapCollaborator(row: CollaboratorRow): WeddingCollaborator {
  return {
    id: row.id,
    weddingId: row.wedding_id,
    email: row.email,
    userId: row.user_id,
    status: row.status === "accepted" ? "accepted" : "pending",
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
  };
}

export async function fetchCollaborators(weddingId: string): Promise<WeddingCollaborator[]> {
  const { data, error } = await supabase
    .from("wedding_collaborators")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("invited_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapCollaborator(row as CollaboratorRow));
}

export async function inviteCollaborator(
  weddingId: string,
  email: string,
): Promise<WeddingCollaborator> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("wedding_collaborators")
    .insert({
      wedding_id: weddingId,
      email: normalized,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;

  const collaborator = mapCollaborator(data as CollaboratorRow);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: wedding } = await supabase
    .from("weddings")
    .select("couple_names")
    .eq("id", weddingId)
    .maybeSingle();

  const { data: emailData, error: emailError } = await supabase.functions.invoke(
    "send-collaborator-invite",
    {
      body: {
        email: normalized,
        coupleNames: wedding?.couple_names ?? "a wedding",
        inviterEmail: user?.email ?? "",
      },
    },
  );

  const emailFailed =
    !!emailError ||
    (emailData &&
      typeof emailData === "object" &&
      "error" in emailData &&
      !!(emailData as { error?: unknown }).error);

  if (emailFailed) {
    await supabase.from("wedding_collaborators").delete().eq("id", collaborator.id);
    const message =
      emailError?.message ||
      (emailData && typeof emailData === "object" && "error" in emailData
        ? String((emailData as { error: unknown }).error)
        : "Failed to send invite email");
    throw new Error(message);
  }

  return collaborator;
}

export async function fetchPlanningTasks(weddingId: string): Promise<PlanningTask[]> {
  const { data, error } = await supabase
    .from("planning_tasks")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("suggested_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapPlanningTask(row as PlanningTaskRow));
}

export async function insertPlanningTask(
  weddingId: string,
  input: Omit<PlanningTask, "id">,
): Promise<PlanningTask> {
  const { data, error } = await supabase
    .from("planning_tasks")
    .insert({
      wedding_id: weddingId,
      task: input.task,
      lead_time: input.leadTime,
      category: input.category,
      commonly_missed: input.commonlyMissed,
      reason: input.reason ?? null,
      done: input.done,
      suggested_date: input.suggestedDate || null,
      event_time: input.eventTime || null,
      venue: input.venue || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapPlanningTask(data as PlanningTaskRow);
}

export async function insertPlanningTasks(
  weddingId: string,
  inputs: Array<Omit<PlanningTask, "id">>,
): Promise<void> {
  if (!inputs.length) return;
  const { error } = await supabase.from("planning_tasks").insert(
    inputs.map((input) => ({
      wedding_id: weddingId,
      task: input.task,
      lead_time: input.leadTime,
      category: input.category,
      commonly_missed: input.commonlyMissed,
      reason: input.reason ?? null,
      done: input.done,
      suggested_date: input.suggestedDate || null,
      event_time: input.eventTime || null,
      venue: input.venue || null,
    })),
  );
  if (error) throw error;
}

export async function deletePlanningTask(weddingId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("planning_tasks")
    .delete()
    .eq("wedding_id", weddingId)
    .eq("id", id);
  if (error) throw error;
}

export async function updatePlanningTask(
  weddingId: string,
  id: string,
  patch: Partial<Pick<PlanningTask, "done" | "suggestedDate" | "eventTime" | "venue" | "task" | "reason">>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.done !== undefined) payload.done = patch.done;
  if (patch.task !== undefined) payload.task = patch.task;
  if (patch.reason !== undefined) payload.reason = patch.reason ?? null;
  if (patch.suggestedDate !== undefined) payload.suggested_date = patch.suggestedDate || null;
  if (patch.eventTime !== undefined) payload.event_time = patch.eventTime || null;
  if (patch.venue !== undefined) payload.venue = patch.venue || null;
  const { error } = await supabase
    .from("planning_tasks")
    .update(payload)
    .eq("wedding_id", weddingId)
    .eq("id", id);
  if (error) throw error;
}

export async function fetchTimelineEvents(weddingId: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("event_date")
    .order("event_time");

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    eventDate: row.event_date,
    time: row.event_time,
    name: row.name,
    venue: row.venue ?? "",
    dressCode: row.dress_code ?? "",
    done: row.done ?? false,
  }));
}

export async function insertTimelineEvent(
  weddingId: string,
  input: CreateTimelineEventInput,
): Promise<TimelineEvent> {
  const { data, error } = await supabase
    .from("timeline_events")
    .insert({
      wedding_id: weddingId,
      event_date: input.eventDate,
      event_time: input.time,
      name: input.name.trim(),
      venue: input.venue?.trim() || "",
      dress_code: input.dressCode?.trim() || "",
      done: false,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    eventDate: data.event_date,
    time: data.event_time,
    name: data.name,
    venue: data.venue ?? "",
    dressCode: data.dress_code ?? "",
    done: data.done ?? false,
  };
}

export async function updateTimelineEvent(
  id: string,
  patch: Partial<Pick<TimelineEvent, "time" | "name" | "venue" | "dressCode" | "done" | "eventDate">>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.time !== undefined) payload.event_time = patch.time;
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.venue !== undefined) payload.venue = patch.venue;
  if (patch.dressCode !== undefined) payload.dress_code = patch.dressCode;
  if (patch.done !== undefined) payload.done = patch.done;
  if (patch.eventDate !== undefined) payload.event_date = patch.eventDate || null;
  const { error } = await supabase.from("timeline_events").update(payload).eq("id", id);
  if (error) throw error;
}

/** Deletes event; event_songs and outfit_plans linked to it CASCADE. */
export async function deleteTimelineEvent(id: string): Promise<void> {
  const { error } = await supabase.from("timeline_events").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPendingSuggestions(weddingId: string): Promise<PendingSuggestion[]> {
  const { data, error } = await supabase
    .from("pending_suggestions")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("category")
    .order("created_at");

  if (error) throw error;
  return (data ?? []).map((row) => mapPendingSuggestion(row as PendingSuggestionRow));
}

export async function syncPendingSuggestionsBatch(
  weddingId: string,
  items: Array<{
    poolItemId: string;
    task: string;
    category: string;
    leadTime: string;
    commonlyMissed: boolean;
    suggestedDate: string;
    batchNonce: number;
  }>,
  opts?: { categories?: string[]; usedPoolItemIds?: string[] },
): Promise<PendingSuggestion[]> {
  let usedPoolIds: Set<string>;
  if (opts?.usedPoolItemIds) {
    usedPoolIds = new Set(opts.usedPoolItemIds);
  } else {
    const { data, error: existingError } = await supabase
      .from("pending_suggestions")
      .select("pool_item_id")
      .eq("wedding_id", weddingId);
    if (existingError) throw existingError;
    usedPoolIds = new Set((data ?? []).map((r) => r.pool_item_id));
  }

  let deleteQuery = supabase
    .from("pending_suggestions")
    .delete()
    .eq("wedding_id", weddingId)
    .eq("status", "pending");

  if (opts?.categories?.length) {
    deleteQuery = deleteQuery.in("category", opts.categories);
  }

  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw deleteError;

  const toInsert = items.filter((item) => !usedPoolIds.has(item.poolItemId));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("pending_suggestions").upsert(
      toInsert.map((item) => ({
        wedding_id: weddingId,
        pool_item_id: item.poolItemId,
        task: item.task,
        category: item.category,
        lead_time: item.leadTime,
        commonly_missed: item.commonlyMissed,
        suggested_date: item.suggestedDate || null,
        status: "pending",
        batch_nonce: item.batchNonce,
      })),
      { onConflict: "wedding_id,pool_item_id", ignoreDuplicates: true },
    );

    if (insertError) throw insertError;
  }

  return fetchPendingSuggestions(weddingId);
}

export async function dismissPendingSuggestion(id: string): Promise<void> {
  const { error } = await supabase
    .from("pending_suggestions")
    .update({ status: "dismissed" })
    .eq("id", id);
  if (error) throw error;
}

export async function removePendingSuggestion(id: string): Promise<void> {
  const { error } = await supabase.from("pending_suggestions").delete().eq("id", id);
  if (error) throw error;
}
