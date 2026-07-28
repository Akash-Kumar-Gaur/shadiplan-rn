import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { MailPlus } from "lucide-react-native";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";
import type { Guest, GuestGroup, MealPref, RsvpStatus } from "../../types/wedding";
import { NEW_GROUP_VALUE } from "../../types/wedding";
import { useFormDirty } from "../../hooks/use-form-dirty";
import {
  useCreateGuestGroup,
  useDeleteGuest,
  useUpdateGuest
} from "../../hooks/use-vendor-guest-mutations";
import { AccompanyingCountStepper } from "../AccompanyingCountStepper";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { AppSelect } from "../AppSelect";
import { AppTextInput } from "../AppTextInput";
import { colors, fonts, radius } from "../../theme/tokens";

type Props = {
  guest: Guest | null;
  guestGroups: GuestGroup[];
  weddingId: string | undefined;
  onClose: () => void;
  onInvite?: (guestId: string) => void;
};

export const GuestEditSheet = forwardRef<BottomSheetModal, Props>(function GuestEditSheet(
  { guest, guestGroups, weddingId, onClose, onInvite },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const updateGuest = useUpdateGuest(weddingId);
  const createGuestGroup = useCreateGuestGroup(weddingId);
  const deleteGuest = useDeleteGuest(weddingId);

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSide, setNewGroupSide] = useState<"Bride" | "Groom">("Bride");
  const [rsvp, setRsvp] = useState<RsvpStatus>("Pending");
  const [phone, setPhone] = useState("");
  const [meal, setMeal] = useState<MealPref>("Veg");
  const [accompanyingCount, setAccompanyingCount] = useState(0);
  const [accommodation, setAccommodation] = useState(false);
  const [transportNeeded, setTransportNeeded] = useState(false);
  const [notes, setNotes] = useState("");
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const group = guest ? guestGroups.find((g) => g.id === guest.groupId) : null;

  useEffect(() => {
    if (!guest) return;
    setName(guest.name);
    setGroupId(guest.groupId || guestGroups[0]?.id || NEW_GROUP_VALUE);
    setNewGroupName("");
    setNewGroupSide("Bride");
    setRsvp(guest.rsvp);
    setPhone(guest.phone ?? "");
    setMeal(guest.meal);
    setAccompanyingCount(guest.accompanyingCount);
    setAccommodation(guest.accommodation);
    setTransportNeeded(guest.transportNeeded);
    setNotes(guest.notes ?? "");
    setRemoveConfirmOpen(false);
    setError(null);
  }, [guest, guestGroups]);

  const formValues = useMemo(
    () => ({
      name,
      groupId,
      newGroupName,
      newGroupSide,
      rsvp,
      phone,
      meal,
      accompanyingCount,
      accommodation,
      transportNeeded,
      notes,
    }),
    [
      name,
      groupId,
      newGroupName,
      newGroupSide,
      rsvp,
      phone,
      meal,
      accompanyingCount,
      accommodation,
      transportNeeded,
      notes,
    ],
  );

  const baseline = useMemo(
    () => ({
      name: guest?.name ?? "",
      groupId: guest?.groupId || guestGroups[0]?.id || NEW_GROUP_VALUE,
      newGroupName: "",
      newGroupSide: "Bride" as const,
      rsvp: guest?.rsvp ?? ("Pending" as RsvpStatus),
      phone: guest?.phone ?? "",
      meal: guest?.meal ?? ("Veg" as MealPref),
      accompanyingCount: guest?.accompanyingCount ?? 0,
      accommodation: guest?.accommodation ?? false,
      transportNeeded: guest?.transportNeeded ?? false,
      notes: guest?.notes ?? "",
    }),
    [guest, guestGroups],
  );

  const isDirty = useFormDirty(formValues, baseline);

  const handleSave = async () => {
    if (!guest) return;

    if (!name.trim()) {
      setError("Guest name is required");
      return;
    }

    let resolvedGroupId = groupId;
    if (groupId === NEW_GROUP_VALUE) {
      if (!newGroupName.trim()) {
        setError("Group name is required for a new group");
        return;
      }
    } else if (!resolvedGroupId) {
      setError("Select a group");
      return;
    }

    setError(null);
    try {
      if (groupId === NEW_GROUP_VALUE) {
        const created = await createGuestGroup.mutateAsync({
          name: newGroupName.trim(),
          side: newGroupSide
});
        resolvedGroupId = created.id;
      }

      await updateGuest.mutateAsync({
        id: guest.id,
        patch: {
          name: name.trim(),
          groupId: resolvedGroupId,
          rsvp,
          phone: phone.trim() || undefined,
          meal,
          accompanyingCount,
          accommodation,
          transportNeeded,
          notes: notes.trim() || undefined
}
});
      innerRef.current?.dismiss();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save guest");
    }
  };

  const handleRemove = async () => {
    if (!guest) return;
    try {
      await deleteGuest.mutateAsync(guest.id);
      innerRef.current?.dismiss();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove guest");
    }
  };

  if (!guest) return null;

  const groupItems = [
    ...guestGroups.map((g) => ({ label: `${g.name} (${g.side} side)`, value: g.id })),
    { label: "Add new group…", value: NEW_GROUP_VALUE },
  ];

  return (
    <AppBottomSheet
      ref={innerRef}
      title="Edit guest"
      subtitle={group ? `${group.name} · ${group.side} side` : undefined}
      isDirty={isDirty}
      onDismiss={() => {
        setRemoveConfirmOpen(false);
        onClose();
      }}
    >
      <AppTextInput
        label="Name *"
        value={name}
        onChangeText={setName}
        placeholder="Guest name"
      />

      <AppSelect
        label="Group"
        value={groupId}
        onSelect={setGroupId}
        options={groupItems}
      />

      {groupId === NEW_GROUP_VALUE ? (
        <View style={formStyles.card}>
          <AppTextInput
            label="New group name *"
            value={newGroupName}
            onChangeText={setNewGroupName}
          />
          <AppSelect
            label="Side"
            value={newGroupSide}
            onSelect={setNewGroupSide}
            options={[
              { label: "Bride", value: "Bride" },
              { label: "Groom", value: "Groom" },
            ]}
          />
        </View>
      ) : null}

      <AppSelect
        label="RSVP"
        value={rsvp}
        onSelect={setRsvp}
        options={[
          { label: "Pending", value: "Pending" },
          { label: "Confirmed", value: "Confirmed" },
          { label: "Declined", value: "Declined" },
        ]}
      />

      <AppTextInput
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <AppSelect
        label="Meal preference"
        value={meal}
        onSelect={setMeal}
        options={[
          { label: "Veg", value: "Veg" },
          { label: "Non-veg", value: "Non-veg" },
          { label: "Jain", value: "Jain" },
        ]}
      />

      <View style={formStyles.field}>
        <AccompanyingCountStepper value={accompanyingCount} onChange={setAccompanyingCount} />
      </View>

      <View style={formStyles.switchRow}>
        <Text style={formStyles.label}>Accommodation needed</Text>
        <Switch value={accommodation} onValueChange={setAccommodation} />
      </View>

      <View style={formStyles.switchRow}>
        <Text style={formStyles.label}>Transport needed</Text>
        <Switch value={transportNeeded} onValueChange={setTransportNeeded} />
      </View>

      <AppTextInput
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {error ? <Text style={formStyles.error}>{error}</Text> : null}

      <AppPressable
        onPress={handleSave}
        disabled={updateGuest.isPending}
        style={[formStyles.primaryBtn, updateGuest.isPending && formStyles.primaryBtnDisabled]}
      >
        {updateGuest.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={formStyles.primaryBtnText}>Save changes</Text>
        )}
      </AppPressable>

      {onInvite ? (
        <AppPressable
          onPress={() => {
            onInvite(guest.id);
            innerRef.current?.dismiss();
            onClose();
          }}
          style={formStyles.outlineBtn}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MailPlus size={16} color={colors.primary} />
            <Text style={formStyles.outlineBtnText}>Create invite</Text>
          </View>
        </AppPressable>
      ) : null}

      {removeConfirmOpen ? (
        <View style={confirmStyles.card}>
          <Text style={confirmStyles.title}>Remove {guest.name}?</Text>
          <Text style={confirmStyles.body}>Any invite for this guest will be removed too.</Text>
          <View style={confirmStyles.actions}>
            <AppPressable onPress={() => setRemoveConfirmOpen(false)} style={confirmStyles.cancelBtn}>
              <Text style={confirmStyles.cancelText}>Cancel</Text>
            </AppPressable>
            <AppPressable
              onPress={handleRemove}
              disabled={deleteGuest.isPending}
              style={confirmStyles.removeBtn}
            >
              {deleteGuest.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={confirmStyles.removeText}>Remove</Text>
              )}
            </AppPressable>
          </View>
        </View>
      ) : (
        <AppPressable onPress={() => setRemoveConfirmOpen(true)} style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.destructive }}>
            Remove guest
          </Text>
        </AppPressable>
      )}
    </AppBottomSheet>
  );
});

const confirmStyles = {
  card: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(196,74,58,0.35)",
    backgroundColor: "rgba(196,74,58,0.08)",
    borderRadius: radius.lg,
    padding: 16
},
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.foreground
},
  body: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground
},
  actions: {
    marginTop: 12,
    flexDirection: "row" as const,
    gap: 8
},
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.background
},
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground
},
  removeBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.destructive
},
  removeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: "#fff"
}
};
