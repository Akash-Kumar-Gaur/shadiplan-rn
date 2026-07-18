import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Contacts from "expo-contacts";
import { Contact } from "lucide-react-native";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";
import type { GuestGroup, MealPref } from "../../types/wedding";
import { NEW_GROUP_VALUE } from "../../types/wedding";
import { useCreateGuest, useCreateGuestGroup } from "../../hooks/use-vendor-guest-mutations";
import { AccompanyingCountStepper } from "../AccompanyingCountStepper";
import { AppBottomSheet, SheetTextInput, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { SheetPicker } from "../SheetPicker";
import { colors } from "../../theme/tokens";

type Props = {
  weddingId: string | undefined;
  guestGroups: GuestGroup[];
  onCreated?: () => void;
};

export const GuestCreateSheet = forwardRef<BottomSheetModal, Props>(function GuestCreateSheet(
  { weddingId, guestGroups, onCreated },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const createGuest = useCreateGuest(weddingId);
  const createGuestGroup = useCreateGuestGroup(weddingId);

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSide, setNewGroupSide] = useState<"Bride" | "Groom">("Bride");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [meal, setMeal] = useState<MealPref>("Veg");
  const [accompanyingCount, setAccompanyingCount] = useState(0);
  const [accommodation, setAccommodation] = useState(false);
  const [transportNeeded, setTransportNeeded] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setGroupId(guestGroups[0]?.id ?? NEW_GROUP_VALUE);
    setNewGroupName("");
    setNewGroupSide("Bride");
    setPhone("");
    setEmail("");
    setMeal("Veg");
    setAccompanyingCount(0);
    setAccommodation(false);
    setTransportNeeded(false);
    setNotes("");
    setError(null);
  };

  useEffect(() => {
    if (guestGroups.length === 0) setGroupId(NEW_GROUP_VALUE);
    else if (!groupId || groupId === NEW_GROUP_VALUE) setGroupId(guestGroups[0]?.id ?? NEW_GROUP_VALUE);
  }, [guestGroups]);

  const pickContact = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") return;
    const contact = await Contacts.presentContactPickerAsync();
    if (contact) {
      setName(contact.name ?? "");
      setPhone(contact.phoneNumbers?.[0]?.number ?? "");
      setEmail(contact.emails?.[0]?.email ?? "");
    }
  };

  const handleSubmit = async () => {
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

      await createGuest.mutateAsync({
        name: name.trim(),
        groupId: resolvedGroupId,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        meal,
        accompanyingCount,
        accommodation,
        transportNeeded,
        notes: notes.trim() || undefined
});
      reset();
      innerRef.current?.dismiss();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add guest");
    }
  };

  const groupItems = [
    ...guestGroups.map((g) => ({ label: `${g.name} (${g.side} side)`, value: g.id })),
    { label: "Add new group…", value: NEW_GROUP_VALUE },
  ];

  return (
    <AppBottomSheet ref={innerRef} title="Add guest" onDismiss={reset}>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>Name *</Text>
        <SheetTextInput
          style={formStyles.input}
          value={name}
          onChangeText={setName}
          placeholder="Guest name"
          placeholderTextColor={colors.textMuted}
        />
        <AppPressable onPress={pickContact} style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Contact size={16} color={colors.terracottaDark} />
          <Text style={{ fontFamily: "Inter-Medium", fontSize: 14, color: colors.terracottaDark }}>
            Pick from contacts
          </Text>
        </AppPressable>
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Group</Text>
        <SheetPicker selectedValue={groupId} onValueChange={setGroupId} items={groupItems} />
      </View>

      {groupId === NEW_GROUP_VALUE ? (
        <View style={formStyles.card}>
          <View>
            <Text style={formStyles.label}>New group name *</Text>
            <SheetTextInput
              style={formStyles.input}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="e.g. Sharma family"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View>
            <Text style={formStyles.label}>Side</Text>
            <SheetPicker
              selectedValue={newGroupSide}
              onValueChange={setNewGroupSide}
              items={[
                { label: "Bride", value: "Bride" },
                { label: "Groom", value: "Groom" },
              ]}
            />
          </View>
        </View>
      ) : null}

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Phone</Text>
        <SheetTextInput
          style={formStyles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Email</Text>
        <SheetTextInput
          style={formStyles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Meal preference</Text>
        <SheetPicker
          selectedValue={meal}
          onValueChange={setMeal}
          items={[
            { label: "Veg", value: "Veg" },
            { label: "Non-veg", value: "Non-veg" },
            { label: "Jain", value: "Jain" },
          ]}
        />
      </View>

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

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Notes</Text>
        <SheetTextInput style={formStyles.textarea} value={notes} onChangeText={setNotes} multiline />
      </View>

      {error ? <Text style={formStyles.error}>{error}</Text> : null}

      <AppPressable
        onPress={handleSubmit}
        disabled={createGuest.isPending || createGuestGroup.isPending}
        style={[
          formStyles.primaryBtn,
          (createGuest.isPending || createGuestGroup.isPending) && formStyles.primaryBtnDisabled,
        ]}
      >
        {createGuest.isPending || createGuestGroup.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={formStyles.primaryBtnText}>Add guest</Text>
        )}
      </AppPressable>
    </AppBottomSheet>
  );
});
